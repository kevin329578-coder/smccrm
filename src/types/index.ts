export type Region = '서울' | '경기'
export type FranchiseeType = '법인' | '개인'
export type FranchiseeStatus = '활성' | '해지'
export type VehicleStatus = '운행중' | '해지'
export type CallStatus = '신청중' | '전환완료' | '해지'

export interface Profile {
  id: string
  username: string
  name: string
  created_at: string
}

export interface Franchisee {
  id: string
  region: Region
  type: FranchiseeType
  business_name: string
  representative_name?: string
  business_reg_no?: string
  address?: string
  phone?: string
  bank_name?: string
  account_no?: string
  account_holder?: string
  tax_invoice_email?: string
  assigned_staff?: string
  joined_at?: string
  status: FranchiseeStatus
  notes?: string
  created_at: string
  updated_at: string
}

export interface FranchiseeCorporateDetails {
  franchisee_id: string
  vehicle_manager_name?: string
  vehicle_manager_email?: string
  vehicle_manager_phone?: string
  settlement_manager_name?: string
  settlement_manager_email?: string
  settlement_manager_phone?: string
  region_hq?: string
  business_type?: string
  business_item?: string
  barobill_registered: boolean
}

export interface FranchiseeIndividualDetails {
  franchisee_id: string
  gender?: string
  birth_date?: string
  tax_reverse_invoice_email?: string
  taxpayer_status?: string
  reverse_invoice_agreed: boolean
  barobill_registered: boolean
  cms_start_month?: string
  cms_account?: string
  esigned_at?: string
  disclosure_provided_at?: string
  poa_provided: boolean
  consignment_agreed: boolean
  privacy_consent: boolean
}

export interface Vehicle {
  id: string
  franchisee_id: string
  plate_no: string
  car_model?: string
  color?: string
  meter_point?: string
  decal_type?: string
  light_type?: string
  is_new_or_converted?: string
  added_at?: string
  terminated_at?: string
  status: VehicleStatus
  notes?: string
  created_at: string
}

export interface Driver {
  id: string
  franchisee_id: string
  vehicle_id?: string | null
  name: string
  birth_date?: string
  gender?: string
  phone?: string
  taxi_license_no?: string
  education_completed_at?: string
  call_status: CallStatus
  call_converted_at?: string
  call_terminated_at?: string
  call_termination_reason?: string
  notes?: string
  created_at: string
}
