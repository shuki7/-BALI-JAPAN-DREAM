export type UserRole = 'admin' | 'staff';
export type StudentStatus = 'active' | 'graduated' | 'departed_japan' | 'withdrawn' | 'on_hold';
export type ProgramType = 'tokutei_ginou' | 'gijinkoku' | 'job_matching_only';
export type StudentSource = 'direct' | 'partner_school';
export type PartnerType = 'school' | 'university' | 'financial' | 'registered_support' | 'company' | 'other';
export type CommissionDirection = 'we_pay' | 'they_pay' | 'none' | 'mutual';
export type CommissionUnit = 'percent' | 'fixed_amount';
export type PaymentType = 'education' | 'job_matching' | 'dormitory' | 'other';
export type PaymentMethod = 'lump_sum' | 'installment';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type DocumentType = 'diploma_high_school' | 'diploma_vocational' | 'diploma_university' | 'transcript' | 'ktp' | 'kk' | 'passport' | 'jlpt_certificate' | 'jft_certificate' | 'ssw_certificate' | 'psychotest_result' | 'mcu_result' | 'job_offer_letter' | 'employment_contract' | 'coe_document' | 'other';
export type OrgType = 'registered_support_org' | 'university_jp' | 'financial_institution' | 'immigration' | 'other';
export type JLPTLevel = 'none' | 'n5' | 'n4' | 'n3' | 'n2' | 'n1';
export type EducationLevel = 'sma' | 'smk' | 'd3' | 's1';
export type GenderType = 'male' | 'female';
export type ParentRelationship = 'father' | 'mother' | 'guardian';
export type VisaType = 'ssw' | 'gijinkoku' | 'other';
export type CommissionPaymentType = 'to_scouter' | 'to_partner' | 'from_partner';
export type CommissionPaymentTiming = 'on_enrollment' | 'on_departure' | 'on_job_matching' | 'custom';

export interface Student {
  id: string;
  registrationNumber: string;
  enrollmentDate: Date;
  status: StudentStatus;
  programType: ProgramType;
  batchNumber: number;
  source: StudentSource;
  partnerSchoolId?: string;
  scouterId?: string;
  fullName: string;
  fullNameKana?: string;
  dateOfBirth: Date;
  gender: GenderType;
  religion?: string;
  nationality: string;
  birthPlace: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  whatsapp: string;
  email?: string;
  nik?: string;
  // 写真（複数枚）
  photos?: { fileId: string; url: string; caption?: string }[];
  photoFileId?: string;  // 後方互換
  photoUrl?: string;     // 後方互換
  // SNS
  instagramAccount?: string;
  tiktokAccount?: string;
  educationLevel: EducationLevel;
  schoolName: string;
  graduationYear?: number;
  jlptLevel: JLPTLevel;
  jlptPassDate?: Date;
  jftPassed: boolean;
  jftPassDate?: Date;
  sswPassed: boolean;
  sswPassDate?: Date;
  psychotestDone: boolean;
  mcuDone: boolean;
  // 保証人・保護者情報（必須）
  parentName: string;
  parentRelationship: ParentRelationship;
  parentDateOfBirth?: Date;
  parentGender?: GenderType;
  parentNik: string;           // 保証人KTP番号（必須）
  parentPhone: string;
  parentWhatsapp: string;      // 必須
  parentAddress: string;       // 必須
  parentCity: string;          // 必須
  parentProvince: string;      // 必須
  parentOccupation: string;    // 必須
  parentEmail?: string;
  parentKtpFileId?: string;    // KTP画像のファイルID
  // 緊急連絡先（保護者と別の場合）
  emergencyContact?: string;
  emergencyPhone?: string;
  emergencyRelationship?: string;
  dormResident: boolean;
  dormRoomNumber?: string;
  dormCheckInDate?: Date;
  dormCheckOutDate?: Date;
  departureDate?: Date;
  destinationCompany?: string;
  destinationPrefecture?: string;
  visaType?: VisaType;
  coeIssueDate?: Date;
  coeCancellationDate?: Date;
  driveFolderId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Installment {
  installmentNumber: number;
  dueDate: Date;
  amount: number;
  paidDate?: Date;
  isPaid: boolean;
  receiptFileId?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  paymentType: PaymentType;
  paymentMethod: PaymentMethod;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: PaymentStatus;
  installments?: Installment[];
  jmStage1Paid?: boolean;
  jmStage1PaidDate?: Date;
  jmStage2Paid?: boolean;
  jmStage2PaidDate?: Date;
  jmStage3Paid?: boolean;
  jmStage3PaidDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BankAccount {
  id: string;
  studentId: string;
  bankName: string;
  bankBranch?: string;
  accountNumber: string;
  accountHolder: string;
  accountType: 'savings' | 'current';
  isPrimary: boolean;
  createdAt: Date;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  documentType: DocumentType;
  title: string;
  fileId: string;
  fileUrl?: string;
  uploadDate: Date;
  isHeld: boolean;
  heldDate?: Date;
  returnedDate?: Date;
  notes?: string;
}

export interface Partner {
  id: string;
  partnerType: PartnerType;
  partnerName: string;
  partnerNameJp?: string;
  country: string;
  province?: string;
  city?: string;
  address?: string;
  contactPersonName: string;
  contactPersonTitle?: string;
  contactPhone: string;
  contactEmail?: string;
  whatsapp?: string;
  commissionType: CommissionDirection;
  commissionRate?: number;
  commissionUnit?: CommissionUnit;
  commissionCurrency?: 'IDR' | 'JPY';
  commissionNotes?: string;
  contractStartDate?: Date;
  contractEndDate?: Date;
  isActive: boolean;
  notes?: string;
  logoFileId?: string;
  createdAt: Date;
}

export interface Scouter {
  id: string;
  fullName: string;
  nickname?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  province?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
  commissionPerStudent: number;
  commissionPaymentTiming: CommissionPaymentTiming;
  commissionNotes?: string;
  totalStudentsReferred?: number;
  totalCommissionPaid?: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
}

export interface CommissionPayment {
  id: string;
  commissionType: CommissionPaymentType;
  recipientId: string;
  recipientType: 'scouter' | 'partner';
  studentId: string;
  amount: number;
  currency: 'IDR' | 'JPY';
  paymentDate?: Date;
  isPaid: boolean;
  paymentMethod?: string;
  receiptFileId?: string;
  notes?: string;
  createdAt: Date;
}

export interface Organization {
  id: string;
  orgType: OrgType;
  orgName: string;
  orgNameId?: string;
  country: string;
  address?: string;
  contactPersonName?: string;
  contactPersonTitle?: string;
  contactPhone?: string;
  contactEmail?: string;
  registrationNumber?: string;
  contractDetails?: string;
  notes?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: Date;
}
export interface StaffMember {
  id: string;
  fullName: string;
  fullNameKana?: string;
  role: 'teacher' | 'staff' | 'management' | 'other';
  specialty?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  
  // New fields
  contractDate?: Date;
  joinedDate?: Date;
  contractPeriod?: string; // e.g., "1 year", "Permanent"
  salary?: number;
  benefits?: string;
  others?: string;
  
  // SNS
  instagramAccount?: string;
  tiktokAccount?: string;
  facebookAccount?: string;
  
  // Media & Docs
  photos?: { fileId: string; url: string; caption?: string }[];
  contractFileId?: string;
  contractFileUrl?: string;
  
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
