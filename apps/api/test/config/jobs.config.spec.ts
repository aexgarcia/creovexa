import { readJobsConfig } from '#app/config/jobs.config';

describe('readJobsConfig', () => {
  it('runs jobs in the API process by default, so one container is enough', () => {
    expect(readJobsConfig({})).toEqual({ worker: true, schema: null });
  });

  it('does not run jobs in tests unless asked', () => {
    expect(readJobsConfig({ NODE_ENV: 'test' })).toMatchObject({ worker: false });
    expect(readJobsConfig({ NODE_ENV: 'test', JOB_WORKER: 'true' })).toMatchObject({
      worker: true,
    });
  });

  it('lets a separate worker take the jobs away from the API', () => {
    expect(readJobsConfig({ JOB_WORKER: 'false' })).toMatchObject({ worker: false });
  });

  it('accepts an explicit queue schema and rejects one pg-boss cannot use', () => {
    expect(readJobsConfig({ JOB_SCHEMA: 'jobs_local' }).schema).toBe('jobs_local');
    expect(() => readJobsConfig({ JOB_SCHEMA: 'Jobs-Local' })).toThrow('JOB_SCHEMA');
    expect(() => readJobsConfig({ JOB_SCHEMA: 'j'.repeat(51) })).toThrow('JOB_SCHEMA');
  });

  it('rejects anything other than true or false', () => {
    expect(() => readJobsConfig({ JOB_WORKER: 'yes' })).toThrow('JOB_WORKER');
  });
});
