import { TemplateRevision } from './template-revision.js';
import { TemplateDimensions } from '../value-objects/template-dimensions.js';
import {
  InvalidTemplateDimensionsError,
  InvalidTemplateRevisionError,
  UnsupportedTemplateDimensionsError,
} from '../errors/template.errors.js';
import { InvalidEntityIdError } from '#app/domain/entity-id';
import { InvalidTimestampError } from '#app/domain/timestamp';
import {
  TEMPLATE_ID,
  ORGANIZATION_ID,
  REVISION_ID,
  NEXT_REVISION_ID,
  CREATED_AT,
  UPDATED_AT,
  templateFixture,
} from '../../../../../test/support/template-fakes.js';

describe('TemplateRevision', () => {
  it('starts at one with stable template and organization references', () => {
    const revision = templateFixture().currentRevision;
    expect(revision.id).toBe(REVISION_ID);
    expect(revision.templateId).toBe(TEMPLATE_ID);
    expect(revision.organizationId).toBe(ORGANIZATION_ID);
    expect(revision.number).toBe(1);
    expect(revision.createdAt.toISOString()).toBe(CREATED_AT);
  });

  it('creates the next revision without mutating the previous one', () => {
    const original = templateFixture().currentRevision;
    const next = original.next(
      NEXT_REVISION_ID,
      TemplateDimensions.create(1080, 1080),
      new Date(UPDATED_AT),
    );
    expect(next.id).toBe(NEXT_REVISION_ID);
    expect(next.number).toBe(2);
    expect(next.templateId).toBe(original.templateId);
    expect(next.organizationId).toBe(original.organizationId);
    expect(next.createdAt.toISOString()).toBe(UPDATED_AT);
    expect(original.id).toBe(REVISION_ID);
    expect(original.number).toBe(1);
    expect(original.createdAt.toISOString()).toBe(CREATED_AT);
  });

  it('rejects reusing the current identity, including different casing', () => {
    const revision = templateFixture().currentRevision;
    expect(() =>
      revision.next(REVISION_ID.toUpperCase(), revision.dimensions, new Date(UPDATED_AT)),
    ).toThrow(InvalidTemplateRevisionError);
  });

  it.each([
    ['invalid', TEMPLATE_ID, ORGANIZATION_ID],
    [REVISION_ID, 'invalid', ORGANIZATION_ID],
    [REVISION_ID, TEMPLATE_ID, 'invalid'],
  ])('validates all revision identifiers', (id, templateId, organizationId) => {
    expect(() =>
      TemplateRevision.initial(
        id,
        templateId,
        organizationId,
        TemplateDimensions.create(1080, 1080),
        new Date(CREATED_AT),
      ),
    ).toThrow(InvalidEntityIdError);
  });

  it.each([
    [1080, 1350],
    [1080, 1920],
    [720, 720],
  ])('rejects the not-yet-supported format %s × %s', (width, height) => {
    const dimensions = TemplateDimensions.create(width, height);
    const original = templateFixture().currentRevision;
    expect(() =>
      TemplateRevision.initial(
        REVISION_ID,
        TEMPLATE_ID,
        ORGANIZATION_ID,
        dimensions,
        new Date(CREATED_AT),
      ),
    ).toThrow(UnsupportedTemplateDimensionsError);
    expect(() => original.next(NEXT_REVISION_ID, dimensions, new Date(UPDATED_AT))).toThrow(
      UnsupportedTemplateDimensionsError,
    );
  });

  it('requires validated dimensions rather than a structurally similar object', () => {
    expect(() =>
      TemplateRevision.initial(
        REVISION_ID,
        TEMPLATE_ID,
        ORGANIZATION_ID,
        { width: 1080, height: 1080 } as TemplateDimensions,
        new Date(CREATED_AT),
      ),
    ).toThrow(InvalidTemplateDimensionsError);
  });

  it('rejects invalid or backwards dates', () => {
    const revision = templateFixture().currentRevision;
    expect(() =>
      TemplateRevision.initial(
        REVISION_ID,
        TEMPLATE_ID,
        ORGANIZATION_ID,
        revision.dimensions,
        new Date(NaN),
      ),
    ).toThrow(InvalidTimestampError);
    expect(() =>
      revision.next(NEXT_REVISION_ID, revision.dimensions, new Date('2026-09-17T00:00:00Z')),
    ).toThrow(InvalidTimestampError);
  });

  it('protects the revision and its creation date from external mutation', () => {
    const date = new Date(CREATED_AT);
    const revision = TemplateRevision.initial(
      REVISION_ID,
      TEMPLATE_ID,
      ORGANIZATION_ID,
      TemplateDimensions.create(1080, 1080),
      date,
    );
    date.setFullYear(2000);
    revision.createdAt.setFullYear(2001);
    expect(() => Object.assign(revision, { number: 99 })).toThrow(TypeError);
    expect(revision.number).toBe(1);
    expect(revision.createdAt.toISOString()).toBe(CREATED_AT);
  });
});
