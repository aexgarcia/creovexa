import {
  DEFAULT_FLYER_DESIGN,
  FlyerDesign,
  InvalidFlyerDesignError,
} from '#app/domain/value-objects/flyer-design';
import { Template } from '#app/modules/templates/domain/entities/template';
import {
  ORGANIZATION_ID,
  REVISION_ID,
  NEXT_REVISION_ID,
  TEMPLATE_ID,
  UPDATED_AT,
  CREATED_AT,
  templateFixture,
} from '../../../../support/template-fakes.js';

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const C = 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
const later = new Date(UPDATED_AT);

describe('Template instructions and style references', () => {
  it('accepts designs without the new fields and normalizes the instructions', () => {
    // Un diseño guardado antes de que existieran instructions y styleReferenceAssetIds.
    const older = Object.fromEntries(
      Object.entries(DEFAULT_FLYER_DESIGN).filter(
        ([key]) => key !== 'instructions' && key !== 'styleReferenceAssetIds',
      ),
    );
    expect(FlyerDesign.create(older).data).toMatchObject({
      instructions: null,
      styleReferenceAssetIds: [],
    });
    expect(
      FlyerDesign.create({ ...DEFAULT_FLYER_DESIGN, instructions: ' Fondo kraft ' }).data
        .instructions,
    ).toBe('Fondo kraft');
  });

  it.each([
    [{ instructions: 'x'.repeat(301) }, 'instructions'],
    [{ styleReferenceAssetIds: [A, B, C] }, 'styleReferenceAssetIds'],
    [{ styleReferenceAssetIds: [A, A] }, 'styleReferenceAssetIds'],
    [{ styleReferenceAssetIds: ['no-uuid'] }, 'styleReferenceAssetIds'],
  ])('rejects %j', (change, field) => {
    expect(() => FlyerDesign.create({ ...DEFAULT_FLYER_DESIGN, ...change })).toThrow(
      expect.objectContaining({ field }) as InvalidFlyerDesignError,
    );
  });

  it('never lets creating or editing the design point to other images', () => {
    const created = Template.create(
      TEMPLATE_ID,
      ORGANIZATION_ID,
      REVISION_ID,
      { name: 'Plantilla', design: { ...DEFAULT_FLYER_DESIGN, styleReferenceAssetIds: [A] } },
      new Date(CREATED_AT),
    );
    expect(created.currentRevision.design.styleReferenceAssetIds).toEqual([]);

    const withA = created.withStyleReferences(NEXT_REVISION_ID, later, [A]);
    const edited = withA.revise('dddddddd-dddd-4ddd-8ddd-ddddddddddd4', 'Otra', later, {
      ...DEFAULT_FLYER_DESIGN,
      mode: 'LIGHT',
      styleReferenceAssetIds: [B],
    });
    expect(edited.currentRevision.design).toMatchObject({
      mode: 'LIGHT',
      styleReferenceAssetIds: [A],
    });
  });

  it('adds or removes references in a new revision and keeps the design', () => {
    const original = templateFixture();
    const updated = original.withStyleReferences(NEXT_REVISION_ID, later, [A, B]);
    expect(updated.currentRevision.number).toBe(2);
    expect(updated.currentRevision.design).toEqual({
      ...original.currentRevision.design,
      styleReferenceAssetIds: [A, B],
    });
    expect(original.currentRevision.design.styleReferenceAssetIds).toEqual([]);
    expect(() => original.withStyleReferences(NEXT_REVISION_ID, later, [A, B, C])).toThrow(
      InvalidFlyerDesignError,
    );
  });
});
