import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE_CONFIG,
  type PrintTemplateCustomization,
} from '../src/models/templateConfig';

describe('TASK-7.5: Visual Print Template Customizer Engine', () => {
  it('provides comprehensive institutional default configuration', () => {
    expect(DEFAULT_TEMPLATE_CONFIG.institutionName).toBe('CENTRAL UNIVERSITY EXAMINATION CELL');
    expect(DEFAULT_TEMPLATE_CONFIG.subtitle).toBe('OFFICE OF THE CONTROLLER OF EXAMINATIONS');
    expect(DEFAULT_TEMPLATE_CONFIG.headerAlignment).toBe('center');
    expect(DEFAULT_TEMPLATE_CONFIG.signatureLabels.left).toBe('Hall Invigilator');
    expect(DEFAULT_TEMPLATE_CONFIG.signatureLabels.right).toBe('Chief Superintendent');
    expect(DEFAULT_TEMPLATE_CONFIG.tableDensity).toBe('normal');
  });

  it('allows customizing institutional logo, header alignment, and department titles', () => {
    const customConfig: PrintTemplateCustomization = {
      ...DEFAULT_TEMPLATE_CONFIG,
      institutionName: 'STANFORD INSTITUTE OF TECHNOLOGY',
      subtitle: 'FACULTY OF ENGINEERING & APPLIED SCIENCE',
      logoUrl: 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
      showLogo: true,
      headerAlignment: 'split',
      signatureLabels: {
        left: 'Room Invigilator / Faculty',
        center: 'Flying Squad Officer',
        right: 'Controller of Examinations',
      },
      tableDensity: 'compact',
    };

    expect(customConfig.institutionName).toBe('STANFORD INSTITUTE OF TECHNOLOGY');
    expect(customConfig.showLogo).toBe(true);
    expect(customConfig.logoUrl).toContain('data:image/svg+xml');
    expect(customConfig.headerAlignment).toBe('split');
    expect(customConfig.signatureLabels.center).toBe('Flying Squad Officer');
    expect(customConfig.tableDensity).toBe('compact');
  });
});
