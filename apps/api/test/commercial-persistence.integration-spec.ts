import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '#app/app.module';
import { DATABASE_CONFIG, readDatabaseConfig } from '#app/config/database.config';
import { CLOCK } from '#app/infrastructure/commercial-persistence.module';
import { PrismaService } from '#app/infrastructure/persistence/prisma/prisma.service';
import {
  PersistenceConflictError,
  PersistenceReferenceError,
  PersistenceScopeError,
} from '#app/infrastructure/persistence/persistence.errors';
import { entityId } from '#app/domain/entity-id';
import { Money, Currency } from '#app/domain/value-objects/money';
import { Organization } from '#app/modules/organizations/domain/entities/organization';
import { OrganizationNotFoundError } from '#app/modules/organizations/domain/errors/organization.errors';
import { Product } from '#app/modules/products/domain/entities/product';
import { ProductKind } from '#app/modules/products/domain/product-kind';
import { ProductNotFoundError } from '#app/modules/products/domain/errors/product.errors';
import { ProductOrganizationNotFoundError } from '#app/modules/products/application/errors/product-organization-not-found.error';
import { Template } from '#app/modules/templates/domain/entities/template';
import { TemplateDimensions } from '#app/modules/templates/domain/value-objects/template-dimensions';
import { CreateOrganization } from '#app/modules/organizations/application/use-cases/create-organization';
import { UpdateOrganizationProfile } from '#app/modules/organizations/application/use-cases/update-organization-profile';
import { CreateProduct } from '#app/modules/products/application/use-cases/create-product';
import { UpdateProduct } from '#app/modules/products/application/use-cases/update-product';
import { CreateTemplate } from '#app/modules/templates/application/use-cases/create-template';
import { PrismaOrganizationRepository } from '#app/modules/organizations/infrastructure/persistence/prisma/prisma-organization.repository';
import { PrismaProductRepository } from '#app/modules/products/infrastructure/persistence/prisma/prisma-product.repository';
import { PrismaTemplateRepository } from '#app/modules/templates/infrastructure/persistence/prisma/prisma-template.repository';
import { ProductMapper } from '#app/modules/products/infrastructure/persistence/prisma/product.mapper';

const NOW = new Date('2026-09-19T12:00:00.000Z');
const LATER = new Date('2026-09-19T13:00:00.000Z');
const uuid = () => entityId(randomUUID());

describe('Commercial persistence (PostgreSQL)', () => {
  let module: TestingModule;
  let database: PrismaService;
  let organizations: PrismaOrganizationRepository;
  let products: PrismaProductRepository;
  let templates: PrismaTemplateRepository;
  const clock = {
    value: NOW,
    now() {
      return new Date(this.value);
    },
  };

  beforeAll(async () => {
    const schema = process.env.CREOVEXA_TEST_SCHEMA ?? '';
    if (!/^creovexa_test_[0-9a-f]{32}$/.test(schema))
      throw new Error('Usa pnpm test:integration para crear el esquema aislado.');
    const config = readDatabaseConfig({ DATABASE_URL: process.env.TEST_DATABASE_URL });
    if (config.schema !== schema)
      throw new Error('El esquema de pruebas no coincide con la conexión.');
    module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_CONFIG)
      .useValue(config)
      .overrideProvider(CLOCK)
      .useValue(clock)
      .compile();
    await module.init();
    database = module.get(PrismaService);
    organizations = module.get(PrismaOrganizationRepository);
    products = module.get(PrismaProductRepository);
    templates = module.get(PrismaTemplateRepository);
  });

  beforeEach(() => {
    clock.value = NOW;
  });
  afterAll(async () => {
    await module?.close();
  });

  async function organization() {
    const result = await module
      .get(CreateOrganization)
      .execute({ name: 'Empresa de prueba', description: 'Perfil' });
    return entityId(result.id);
  }

  function product(organizationId: string, id = uuid()) {
    return Product.create(
      id,
      organizationId,
      ProductKind.PRODUCT,
      {
        name: 'Producto',
        regularPrice: Money.fromMinorUnits(2500, Currency.PEN),
        imageAssetIds: [uuid()],
      },
      NOW,
    );
  }

  function template(organizationId: string, revisionId = uuid()) {
    return Template.create(
      uuid(),
      organizationId,
      revisionId,
      { name: 'Plantilla', dimensions: TemplateDimensions.create(1080, 1080) },
      NOW,
    );
  }

  it('runs organization use cases through Nest injection and reloads domain state and dates', async () => {
    const id = await organization();
    clock.value = LATER;
    const updated = await module.get(UpdateOrganizationProfile).execute({
      organizationId: id,
      name: 'Actualizada',
      brandTone: 'Cercano',
      logoAssetId: uuid(),
    });
    const restored = await organizations.findById(id);
    expect(restored).toBeInstanceOf(Organization);
    expect(restored!.name).toBe(updated.name);
    expect(restored!.brandTone).toBe('Cercano');
    expect(restored!.createdAt.toISOString()).toBe(NOW.toISOString());
    expect(restored!.updatedAt.toISOString()).toBe(LATER.toISOString());
    expect(await organizations.findById(uuid())).toBeNull();
  });

  it.each(Object.values(ProductKind))(
    'round-trips a %s with safe-integer money beyond PostgreSQL INT32',
    async (kind) => {
      const organizationId = await organization();
      const created = await module.get(CreateProduct).execute({
        organizationId,
        kind,
        name: 'Catálogo',
        regularPrice: { amountMinor: Number.MAX_SAFE_INTEGER, currency: Currency.EUR },
        imageAssetIds: [uuid(), uuid()],
      });
      const id = entityId(created.id);
      const row = await database.product.findUniqueOrThrow({ where: { id } });
      expect(row.amountMinor).toBe(BigInt(Number.MAX_SAFE_INTEGER));
      clock.value = LATER;
      await module.get(UpdateProduct).execute({
        organizationId,
        productId: id,
        name: 'Nuevo nombre',
        regularPrice: { amountMinor: 4300, currency: Currency.USD },
      });
      const loaded = await products.findById(organizationId, id);
      expect(loaded).toBeInstanceOf(Product);
      expect(loaded!.kind).toBe(kind);
      expect(loaded!.regularPrice.equals(Money.fromMinorUnits(4300, Currency.USD))).toBe(true);
      expect(loaded!.imageAssetIds).toEqual(created.imageAssetIds);
      expect(loaded!.createdAt.toISOString()).toBe(NOW.toISOString());
      expect(loaded!.updatedAt.toISOString()).toBe(LATER.toISOString());
    },
  );

  it('scopes reads and updates to the owner even if a caller constructs another aggregate with the same ID', async () => {
    const owner = await organization();
    const other = await organization();
    const entity = product(owner);
    await products.add(owner, entity);
    expect(await products.findById(other, entity.id)).toBeNull();
    await expect(products.add(other, entity)).rejects.toThrow(PersistenceScopeError);
    await expect(products.save(other, entity)).rejects.toThrow(PersistenceScopeError);
    const unrelated = product(other, entity.id).updateDetails({ name: 'Ajeno' }, LATER);
    await expect(products.save(other, unrelated)).rejects.toThrow(ProductNotFoundError);
    expect((await products.findById(owner, entity.id))!.name).toBe('Producto');
  });

  it('does not upsert missing organizations or products', async () => {
    const owner = await organization();
    const missingOrganization = Organization.create(uuid(), { name: 'Ausente' }, NOW);
    const missingProduct = product(owner);
    await expect(organizations.save(missingOrganization)).rejects.toThrow(
      OrganizationNotFoundError,
    );
    await expect(products.save(owner, missingProduct)).rejects.toThrow(ProductNotFoundError);
    expect(await organizations.findById(missingOrganization.id)).toBeNull();
    expect(await products.findById(owner, missingProduct.id)).toBeNull();
  });

  it('lets PostgreSQL reject two concurrent inserts with the same identity', async () => {
    const entity = Organization.create(uuid(), { name: 'Única' }, NOW);
    const results = await Promise.allSettled([
      organizations.add(entity),
      organizations.add(entity),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((result) => result.status === 'rejected')?.reason).toBeInstanceOf(
      PersistenceConflictError,
    );
    expect(await database.organization.count({ where: { id: entity.id } })).toBe(1);
  });

  it('enforces organization existence both through the lookup and through the database foreign key', async () => {
    const missing = uuid();
    await expect(
      module.get(CreateProduct).execute({
        organizationId: missing,
        kind: ProductKind.PRODUCT,
        name: 'Inválido',
        regularPrice: { amountMinor: 100, currency: Currency.PEN },
      }),
    ).rejects.toThrow(ProductOrganizationNotFoundError);
    await expect(products.add(missing, product(missing))).rejects.toThrow(
      PersistenceReferenceError,
    );
  });

  it('inserts a template and its initial revision atomically through the real use case', async () => {
    const organizationId = await organization();
    const result = await module
      .get(CreateTemplate)
      .execute({ organizationId, name: 'Cuadrada', dimensions: { width: 1080, height: 1080 } });
    const row = await database.template.findUniqueOrThrow({
      where: { id: result.id },
      include: { currentRevision: true, revisions: true },
    });
    expect(row.organizationId).toBe(organizationId);
    expect(row.currentRevisionId).toBe(result.currentRevision.id);
    expect(row.revisions).toHaveLength(1);
    expect(row.currentRevision).toMatchObject({
      templateId: result.id,
      organizationId,
      number: 1n,
      width: 1080,
      height: 1080,
    });
  });

  it('rolls back the template insert if its revision conflicts with an existing ID', async () => {
    const organizationId = await organization();
    const first = template(organizationId);
    await templates.add(organizationId, first);
    const conflicting = template(organizationId, first.currentRevision.id);
    await expect(templates.add(organizationId, conflicting)).rejects.toThrow(
      PersistenceConflictError,
    );
    expect(await database.template.findUnique({ where: { id: conflicting.id } })).toBeNull();
    expect(await database.templateRevision.count({ where: { templateId: conflicting.id } })).toBe(
      0,
    );
    expect(
      (await database.template.findUniqueOrThrow({ where: { id: first.id } })).currentRevisionId,
    ).toBe(first.currentRevision.id);
  });

  it('rejects a template saved under the wrong owner and prevents cross-owner revision references in SQL', async () => {
    const owner = await organization();
    const other = await organization();
    const first = template(owner);
    await expect(templates.add(other, first)).rejects.toThrow(PersistenceScopeError);
    await templates.add(owner, first);
    await expect(
      database.templateRevision.create({
        data: {
          id: uuid(),
          organizationId: other,
          templateId: first.id,
          number: 2,
          width: 1080,
          height: 1080,
          createdAt: LATER,
        },
      }),
    ).rejects.toThrow();
    const second = template(other);
    await templates.add(other, second);
    await expect(
      database.template.update({
        where: { id: first.id },
        data: { currentRevisionId: second.currentRevision.id },
      }),
    ).rejects.toThrow();
    expect(
      (await database.template.findUniqueOrThrow({ where: { id: first.id } })).currentRevisionId,
    ).toBe(first.currentRevision.id);
  });

  it('requires a valid current revision at commit even when SQL bypasses the repository', async () => {
    const organizationId = await organization();
    const id = uuid();
    await expect(
      database.template.create({
        data: {
          id,
          organizationId,
          name: 'Sin revisión',
          currentRevisionId: uuid(),
          createdAt: NOW,
          updatedAt: NOW,
        },
      }),
    ).rejects.toThrow();
    expect(await database.template.findUnique({ where: { id } })).toBeNull();
  });

  it('protects revision numbers with a unique constraint', async () => {
    const organizationId = await organization();
    const entity = template(organizationId);
    await templates.add(organizationId, entity);
    await expect(
      database.templateRevision.create({
        data: {
          id: uuid(),
          organizationId,
          templateId: entity.id,
          number: 1,
          width: 1080,
          height: 1080,
          createdAt: LATER,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it.each([-1n, 9007199254740992n])(
    'rejects a price outside the Money range at the database boundary: %s',
    async (amountMinor) => {
      const organizationId = await organization();
      const row = ProductMapper.toPersistence(product(organizationId));
      await expect(database.product.create({ data: { ...row, amountMinor } })).rejects.toThrow();
      expect(await database.product.findUnique({ where: { id: row.id } })).toBeNull();
    },
  );

  it('keeps the parent organization when dependent data exists', async () => {
    const organizationId = await organization();
    await products.add(organizationId, product(organizationId));
    await expect(database.organization.delete({ where: { id: organizationId } })).rejects.toThrow();
    expect(await organizations.findById(organizationId)).not.toBeNull();
  });
});
