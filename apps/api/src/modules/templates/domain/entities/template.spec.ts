import { Template } from './template.js';
import { TemplateDimensions } from '../value-objects/template-dimensions.js';
import {
  InvalidTemplateNameError,
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

describe('Template', () => {
  it('creates a named aggregate with a matching initial revision', () => {
    const template = templateFixture();
    expect(template.name).toBe('Promoción');
    expect(template.id).toBe(TEMPLATE_ID);
    expect(template.organizationId).toBe(ORGANIZATION_ID);
    expect(template.currentRevision.templateId).toBe(template.id);
    expect(template.currentRevision.organizationId).toBe(template.organizationId);
    expect(template.createdAt.toISOString()).toBe(CREATED_AT);
    expect(template.updatedAt.toISOString()).toBe(CREATED_AT);
  });

  it.each(['', ' \n '])('rejects blank names %j', (name) => {
    expect(() =>
      Template.create(
        TEMPLATE_ID,
        ORGANIZATION_ID,
        REVISION_ID,
        { name, dimensions: TemplateDimensions.create(1080, 1080) },
        new Date(CREATED_AT),
      ),
    ).toThrow(InvalidTemplateNameError);
  });

  it('preserves template identity and existing references when adding a revision', () => {
    const original = templateFixture();
    const campaignRevisionReference = original.currentRevision;
    const updated = original.createRevision(
      NEXT_REVISION_ID,
      TemplateDimensions.create(1080, 1080),
      new Date(UPDATED_AT),
    );

    expect(updated.id).toBe(original.id);
    expect(updated.organizationId).toBe(original.organizationId);
    expect(updated.name).toBe(original.name);
    expect(updated.createdAt).toEqual(original.createdAt);
    expect(updated.updatedAt.toISOString()).toBe(UPDATED_AT);
    expect(updated.currentRevision.id).toBe(NEXT_REVISION_ID);
    expect(updated.currentRevision.number).toBe(2);
    expect(campaignRevisionReference.id).toBe(REVISION_ID);
    expect(campaignRevisionReference.number).toBe(1);
    expect(original.currentRevision).toBe(campaignRevisionReference);
    expect(original.updatedAt.toISOString()).toBe(CREATED_AT);
  });

  it('increments revision numbers across successive valid revisions', () => {
    const second = templateFixture().createRevision(
      NEXT_REVISION_ID,
      TemplateDimensions.create(1080, 1080),
      new Date(UPDATED_AT),
    );
    const third = second.createRevision(
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      TemplateDimensions.create(1080, 1080),
      new Date(UPDATED_AT),
    );
    expect(third.currentRevision.number).toBe(3);
    expect(second.currentRevision.number).toBe(2);
  });

  it('leaves the original aggregate unchanged when a revision fails validation', () => {
    const original = templateFixture();
    expect(() =>
      original.createRevision(
        NEXT_REVISION_ID,
        TemplateDimensions.create(1080, 1350),
        new Date(UPDATED_AT),
      ),
    ).toThrow(UnsupportedTemplateDimensionsError);
    expect(original.currentRevision.id).toBe(REVISION_ID);
    expect(original.updatedAt.toISOString()).toBe(CREATED_AT);
  });

  it('validates new revision identifiers and dates before changing the aggregate', () => {
    const original = templateFixture();
    expect(() =>
      original.createRevision('invalid', original.currentRevision.dimensions, new Date(UPDATED_AT)),
    ).toThrow(InvalidEntityIdError);
    expect(() =>
      original.createRevision(NEXT_REVISION_ID, original.currentRevision.dimensions, new Date(NaN)),
    ).toThrow(InvalidTimestampError);
    const updated = original.createRevision(
      NEXT_REVISION_ID,
      original.currentRevision.dimensions,
      new Date(UPDATED_AT),
    );
    expect(() =>
      updated.createRevision(
        'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        updated.currentRevision.dimensions,
        new Date(CREATED_AT),
      ),
    ).toThrow(InvalidTimestampError);
  });

  it('returns defensive copies of aggregate timestamps', () => {
    const template = templateFixture();
    template.createdAt.setFullYear(2000);
    template.updatedAt.setFullYear(2001);
    expect(template.createdAt.toISOString()).toBe(CREATED_AT);
    expect(template.updatedAt.toISOString()).toBe(CREATED_AT);
  });
});
