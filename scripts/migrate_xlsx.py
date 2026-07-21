import sys, os, json
sys.stdout.reconfigure(encoding='utf-8')
import openpyxl
import urllib.request

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

def insert_franchisee(row):
    body = json.dumps(row).encode('utf-8')
    req = urllib.request.Request(
        SUPABASE_URL + '/rest/v1/franchisees',
        data=body, method='POST',
        headers={
            'apikey': SERVICE_KEY, 'Authorization': f'Bearer {SERVICE_KEY}',
            'Content-Type': 'application/json', 'Prefer': 'return=representation',
        },
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())

def to_text(v):
    if v is None:
        return None
    return str(v).strip() or None

def main():
    wb = openpyxl.load_workbook(XLSX_PATH, data_only=True, read_only=True)
    ws = wb['가맹점 정보(서울법인)']
    inserted, skipped = 0, 0
    log_path = os.path.join(os.path.dirname(__file__), 'migrate_log.txt')
    with open(log_path, 'w', encoding='utf-8') as log:
        # 헤더는 4행(0-index 기준 컬럼: 6=사업자등록번호, 7=사업자명, 8=대표자명, 10=전화번호,
        # 17=주소, 20=금융기관명, 21=계좌번호, 22=예금주명, 23=세금계산서메일), 데이터는 5행부터
        for row in ws.iter_rows(min_row=5, values_only=True):
            business_name = to_text(row[7])
            # NO. 컬럼(row[0])이 비어있는 행은 5행의 "샘플(유)삼우교통" 같은 예시행이라 건너뛴다
            if not business_name or row[0] is None:
                skipped += 1
                continue
            payload = {
                'region': '서울',
                'type': '법인',
                'business_name': business_name,
                'representative_name': to_text(row[8]),
                'business_reg_no': to_text(row[6]),
                'address': to_text(row[17]),
                'phone': to_text(row[10]),
                'bank_name': to_text(row[20]),
                'account_no': to_text(row[21]),
                'account_holder': to_text(row[22]),
                'tax_invoice_email': to_text(row[23]),
                'status': '활성',
            }
            try:
                insert_franchisee(payload)
                inserted += 1
            except Exception as e:
                skipped += 1
                log.write(f"실패: {business_name} - {e}\n")
    print(f'완료. 삽입 {inserted}건, 스킵 {skipped}건. 로그: {log_path}')

if __name__ == '__main__':
    main()
