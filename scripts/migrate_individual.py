import sys, os, json, base64, datetime
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl
import urllib.request
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

XLSX_PATH = r"C:\Users\SMC\Desktop\케빈의 프로젝트\SMC_CRM\캡시 사업운영 관리.xlsx"
ENV_PATH = os.path.join(os.path.dirname(__file__), '..', '.env.local')

env = {}
with open(ENV_PATH, encoding='utf-8') as f:
    for line in f:
        if '=' in line:
            k, v = line.strip().split('=', 1)
            env[k] = v

SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
SERVICE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
RRN_KEY = base64.b64decode(env['RRN_ENCRYPTION_KEY'])
HEADERS = {
    'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}',
    'Content-Type': 'application/json', 'Prefer': 'return=representation',
}
HEADERS_TEXT = {**HEADERS}  # bytea 컬럼은 REST에 base64 문자열로 보낸다 (Supabase가 \x 접두 hex 또는 base64 인식)

def post_json(url, payload, headers=HEADERS):
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), method='POST', headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def to_text(v):
    if v is None:
        return None
    return str(v).strip() or None

def to_date(v):
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.isoformat()[:10]
    return None

def to_bool_o(v):
    return str(v).strip().upper() == 'O' if v is not None else False

def encrypt_rrn(plain: str) -> str:
    iv = os.urandom(12)
    aesgcm = AESGCM(RRN_KEY)
    ct_and_tag = aesgcm.encrypt(iv, plain.encode('utf-8'), None)
    ciphertext, tag = ct_and_tag[:-16], ct_and_tag[-16:]
    enc = iv + tag + ciphertext
    # PostgREST/Supabase는 bytea를 "\x<hex>" 형식 문자열로 받으면 정확히 해석한다
    return '\\x' + enc.hex()

def is_terminated(row):
    note_area = [str(v) for v in row[23:36] if v is not None]
    return '해지' in ' '.join(note_area)

def migrate_individual_sheet(sheet_name, region):
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True, read_only=True)
    ws = wb[sheet_name]
    inserted, skipped = 0, 0
    log_path = os.path.join(os.path.dirname(__file__), 'migrate_log.txt')
    with open(log_path, 'a', encoding='utf-8') as log:
        log.write(f"\n=== {sheet_name} ===\n")
        for row in ws.iter_rows(min_row=4, values_only=True):
            business_name = to_text(row[15])
            if row[0] is None or not business_name:
                skipped += 1
                continue
            try:
                terminated = is_terminated(row)
                # 1) 가맹점
                f_payload = {
                    'region': region, 'type': '개인', 'business_name': business_name,
                    'representative_name': to_text(row[16]) or business_name,
                    'business_reg_no': to_text(row[14]),
                    'address': to_text(row[17]),
                    'phone': to_text(row[13]),
                    'bank_name': to_text(row[18]),
                    'account_no': to_text(row[19]),
                    'account_holder': to_text(row[20]),
                    'tax_invoice_email': to_text(row[21]),
                    'status': '해지' if terminated else '활성',
                }
                f_result = post_json(f"{SUPABASE_URL}/rest/v1/franchisees", f_payload)
                franchisee_id = f_result[0]['id']

                # 2) 개인 전용 상세
                rrn = to_text(row[26])
                d_payload = {
                    'franchisee_id': franchisee_id,
                    'tax_reverse_invoice_email': to_text(row[22]),
                    'taxpayer_status': to_text(row[23]),
                    'reverse_invoice_agreed': to_bool_o(row[24]),
                    'barobill_registered': to_bool_o(row[25]),
                    'cms_start_month': to_text(row[28]),
                    'cms_account': to_text(row[29]),
                    'esigned_at': to_date(row[30]),
                    'disclosure_provided_at': to_date(row[31]),
                    'poa_provided': to_bool_o(row[34]),
                    'consignment_agreed': to_bool_o(row[35]),
                    'privacy_consent': to_bool_o(row[36]) if len(row) > 36 else False,
                }
                if rrn:
                    d_payload['resident_reg_no_enc'] = encrypt_rrn(rrn)
                post_json(f"{SUPABASE_URL}/rest/v1/franchisee_individual_details", d_payload)

                # 3) 차량 (있는 경우만)
                vehicle_id = None
                plate_no = to_text(row[3])
                if plate_no:
                    v_payload = {
                        'franchisee_id': franchisee_id, 'plate_no': plate_no,
                        'car_model': to_text(row[8]), 'color': to_text(row[9]),
                        'meter_point': to_text(row[4]), 'added_at': to_date(row[6]),
                        'status': '해지' if terminated else '운행중',
                        'terminated_at': to_date(row[6]) if terminated else None,
                    }
                    v_result = post_json(f"{SUPABASE_URL}/rest/v1/vehicles", v_payload)
                    vehicle_id = v_result[0]['id']

                # 4) 기사 (가맹점 = 기사 본인)
                d2_payload = {
                    'franchisee_id': franchisee_id, 'vehicle_id': vehicle_id,
                    'name': business_name, 'taxi_license_no': to_text(row[7]),
                    'education_completed_at': to_date(row[10]),
                    'phone': to_text(row[13]),
                    'call_status': '해지' if terminated else '전환완료',
                }
                post_json(f"{SUPABASE_URL}/rest/v1/drivers", d2_payload)

                inserted += 1
            except Exception as e:
                skipped += 1
                log.write(f"실패: {business_name} - {e}\n")
    print(f'{sheet_name} 완료. 삽입 {inserted}건, 스킵 {skipped}건.')

if __name__ == '__main__':
    migrate_individual_sheet('경기개인가맹 컨택포인트', '경기')
