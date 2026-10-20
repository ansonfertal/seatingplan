export type HeaderAlignment = 'left' | 'center' | 'split';
export type TableDensity = 'compact' | 'normal' | 'spacious';
export type FontSizeScale = 'sm' | 'base' | 'lg';

export type PrintTemplateCustomization = {
  institutionName: string;
  subtitle: string;
  logoUrl?: string;
  showLogo: boolean;
  headerAlignment: HeaderAlignment;
  signatureLabels: {
    left: string;
    center?: string;
    right: string;
  };
  fontSize: FontSizeScale;
  tableDensity: TableDensity;
  customNoticeFooter?: string;
};

export const DEFAULT_TEMPLATE_CONFIG: PrintTemplateCustomization = {
  institutionName: 'CENTRAL UNIVERSITY EXAMINATION CELL',
  subtitle: 'OFFICE OF THE CONTROLLER OF EXAMINATIONS',
  logoUrl: '',
  showLogo: false,
  headerAlignment: 'center',
  signatureLabels: {
    left: 'Hall Invigilator',
    center: 'Verified By / Squad',
    right: 'Chief Superintendent',
  },
  fontSize: 'base',
  tableDensity: 'normal',
  customNoticeFooter: 'Candidates are required to occupy their allocated seats 15 minutes before the commencement of the examination.',
};
