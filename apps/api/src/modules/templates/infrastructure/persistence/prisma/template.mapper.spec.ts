import { TemplateMapper } from './template.mapper.js';
import { Template } from '../../../domain/entities/template.js';
import { TemplateRevision } from '../../../domain/entities/template-revision.js';
import { InvalidTemplateRevisionError } from '../../../domain/errors/template.errors.js';
import { TemplateDimensions } from '../../../domain/value-objects/template-dimensions.js';
import {
  templateFixture,
  NEXT_REVISION_ID,
  OTHER_ORGANIZATION_ID,
  UPDATED_AT,
} from '../../../../../../test/support/template-fakes.js';
import { templateResult } from '../../../application/template-result.js';

describe('Template reconstruction', () => {
  it('restores the current revision without recreating revision one', () => {
    const template = templateFixture().createRevision(
      NEXT_REVISION_ID,
      TemplateDimensions.create(1080, 1080),
      new Date(UPDATED_AT),
    );
    const row = TemplateMapper.toPersistence(template);
    expect(
      templateResult(TemplateMapper.toDomain({ ...row.template, currentRevision: row.revision })),
    ).toEqual(templateResult(template));
  });
  it('rejects mismatched stored revision identity or ownership', () => {
    const row = TemplateMapper.toPersistence(templateFixture());
    expect(() =>
      TemplateMapper.toDomain({
        ...row.template,
        currentRevisionId: NEXT_REVISION_ID,
        currentRevision: row.revision,
      }),
    ).toThrow(InvalidTemplateRevisionError);
    expect(() =>
      TemplateMapper.toDomain({
        ...row.template,
        currentRevision: { ...row.revision, organizationId: OTHER_ORGANIZATION_ID },
      }),
    ).toThrow(InvalidTemplateRevisionError);
    expect(() =>
      TemplateMapper.toDomain({
        ...row.template,
        currentRevision: { ...row.revision, number: 9007199254740992n },
      }),
    ).toThrow(InvalidTemplateRevisionError);
  });
  it('rejects invalid revision counters and dates inconsistent with the aggregate', () => {
    const template = templateFixture();
    const revision = template.currentRevision;
    for (const number of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1])
      expect(() =>
        TemplateRevision.restore(
          revision.id,
          template.id,
          template.organizationId,
          number,
          revision.dimensions,
          revision.createdAt,
        ),
      ).toThrow(InvalidTemplateRevisionError);
    expect(() =>
      Template.restore(
        template.id,
        template.organizationId,
        template.name,
        revision,
        template.createdAt,
        new Date(UPDATED_AT),
      ),
    ).toThrow(InvalidTemplateRevisionError);
  });
});
