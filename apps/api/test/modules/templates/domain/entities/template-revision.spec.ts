import { TemplateRevision } from '#app/modules/templates/domain/entities/template-revision';
import { TemplateDimensions } from '#app/modules/templates/domain/value-objects/template-dimensions';
import {
  InvalidTemplateDimensionsError,
  InvalidTemplateRevisionError,
} from '#app/modules/templates/domain/errors/template.errors';
import {
  DEFAULT_FLYER_DESIGN,
  InvalidFlyerDesignError,
} from '#app/domain/value-objects/flyer-design';
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
} from '../../../../support/template-fakes.js';

const story = { ...DEFAULT_FLYER_DESIGN, format: 'STORY' };

describe('TemplateRevision', () => {
  it('starts at one with stable references and the default square design', () => {
    const revision = templateFixture().currentRevision;
    expect(revision.id).toBe(REVISION_ID);
    expect(revision.templateId).toBe(TEMPLATE_ID);
    expect(revision.organizationId).toBe(ORGANIZATION_ID);
    expect(revision.number).toBe(1);
    expect(revision.design).toEqual(DEFAULT_FLYER_DESIGN);
    expect([revision.dimensions.width, revision.dimensions.height]).toEqual([1080, 1080]);
    expect(revision.createdAt.toISOString()).toBe(CREATED_AT);
  });

  it.each([
    ['SQUARE', 1080],
    ['PORTRAIT', 1350],
    ['STORY', 1920],
  ])('derives the dimensions from the %s format', (format, height) => {
    const revision = TemplateRevision.initial(
      REVISION_ID,
      TEMPLATE_ID,
      ORGANIZATION_ID,
      new Date(CREATED_AT),
      { ...DEFAULT_FLYER_DESIGN, format },
    );
    expect([revision.dimensions.width, revision.dimensions.height]).toEqual([1080, height]);
  });

  it('creates the next revision, with a new format, without mutating the previous one', () => {
    const original = templateFixture().currentRevision;
    const next = original.next(NEXT_REVISION_ID, new Date(UPDATED_AT), story);
    expect(next.number).toBe(2);
    expect(next.design.format).toBe('STORY');
    expect(next.dimensions.height).toBe(1920);
    expect(next.createdAt.toISOString()).toBe(UPDATED_AT);
    expect(original.number).toBe(1);
    expect(original.design.format).toBe('SQUARE');
    expect(original.next(NEXT_REVISION_ID, new Date(UPDATED_AT)).design).toEqual(original.design);
  });

  it('rejects reusing the current identity, including different casing', () => {
    const revision = templateFixture().currentRevision;
    expect(() => revision.next(REVISION_ID.toUpperCase(), new Date(UPDATED_AT))).toThrow(
      InvalidTemplateRevisionError,
    );
  });

  it.each([
    ['invalid', TEMPLATE_ID, ORGANIZATION_ID],
    [REVISION_ID, 'invalid', ORGANIZATION_ID],
    [REVISION_ID, TEMPLATE_ID, 'invalid'],
  ])('validates all revision identifiers', (id, templateId, organizationId) => {
    expect(() =>
      TemplateRevision.initial(id, templateId, organizationId, new Date(CREATED_AT)),
    ).toThrow(InvalidEntityIdError);
  });

  it('rejects an invalid design', () => {
    expect(() =>
      TemplateRevision.initial(REVISION_ID, TEMPLATE_ID, ORGANIZATION_ID, new Date(CREATED_AT), {
        ...DEFAULT_FLYER_DESIGN,
        format: 'A4',
      }),
    ).toThrow(InvalidFlyerDesignError);
  });

  it('restores only when the stored dimensions match the format', () => {
    const restore = (dimensions: TemplateDimensions) =>
      TemplateRevision.restore(
        REVISION_ID,
        TEMPLATE_ID,
        ORGANIZATION_ID,
        3,
        dimensions,
        new Date(CREATED_AT),
        story,
      );
    expect(restore(TemplateDimensions.create(1080, 1920)).number).toBe(3);
    expect(() => restore(TemplateDimensions.create(1080, 1080))).toThrow(
      InvalidTemplateDimensionsError,
    );
  });

  it('rejects invalid or backwards dates', () => {
    const revision = templateFixture().currentRevision;
    expect(() =>
      TemplateRevision.initial(REVISION_ID, TEMPLATE_ID, ORGANIZATION_ID, new Date(NaN)),
    ).toThrow(InvalidTimestampError);
    expect(() => revision.next(NEXT_REVISION_ID, new Date('2026-09-17T00:00:00Z'))).toThrow(
      InvalidTimestampError,
    );
  });

  it('protects the revision and its creation date from external mutation', () => {
    const date = new Date(CREATED_AT);
    const revision = TemplateRevision.initial(REVISION_ID, TEMPLATE_ID, ORGANIZATION_ID, date);
    date.setFullYear(2000);
    revision.createdAt.setFullYear(2001);
    expect(() => Object.assign(revision, { number: 99 })).toThrow(TypeError);
    expect(revision.number).toBe(1);
    expect(revision.createdAt.toISOString()).toBe(CREATED_AT);
  });
});
