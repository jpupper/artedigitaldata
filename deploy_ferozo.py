import ftplib
import io
import os

FTP_HOST = 'c1700065.ferozo.com'
FTP_USER = 'jpupper@jeyder.com.ar'
FTP_PASS = 'Sarosa2025'

local_base = '/tmp/ferozo_upload'
files_to_upload = [
    ('js/forms.js', 'artedigitaldata/js/forms.js', 'js/forms.js'),
    ('js/create.js', 'artedigitaldata/js/create.js', 'js/create.js'),
    ('js/edit-logic.js', 'artedigitaldata/js/edit-logic.js', 'js/edit-logic.js'),
    ('evento.html', 'artedigitaldata/evento.html', 'evento.html'),
]

def ensure_dir(ftp, path):
    parts = path.strip('/').split('/')
    current = ''
    for part in parts:
        if not part:
            continue
        current += '/' + part
        try:
            ftp.cwd(current)
        except:
            ftp.mkd(current)
            ftp.cwd(current)

def upload_file(ftp, local_path, remote_path):
    with open(local_path, 'rb') as f:
        data = f.read()
    buf = io.BytesIO(data)
    remote_dir = '/'.join(remote_path.split('/')[:-1])
    ensure_dir(ftp, remote_dir)
    ftp.cwd('/')
    ftp.storbinary(f'STOR {remote_path}', buf)
    try:
        size = ftp.size(remote_path)
        ok = size == len(data)
        print(f'  {remote_path}: {len(data)} bytes {"OK" if ok else f"SIZE MISMATCH ({size})"}')
    except Exception as e:
        print(f'  {remote_path}: {len(data)} bytes (size check: {e})')

print("Connecting to Ferozo FTP...")
try:
    ftp = ftplib.FTP_TLS(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    ftp.prot_p()
    print("Connected!")
    
    # List directories
    print("\nRoot listing:", ftp.nlst()[:20])
    
    # Upload to /artedigitaldata/
    print('\n--- Uploading to /artedigitaldata/ ---')
    for local_rel, remote1, remote2 in files_to_upload:
        upload_file(ftp, os.path.join(local_base, local_rel), remote1)
    
    # Also upload to root for artedigitaldata.com  
    print('\n--- Uploading to / (root) ---')
    for local_rel, remote1, remote2 in files_to_upload:
        upload_file(ftp, os.path.join(local_base, local_rel), remote2)
    
    ftp.quit()
    print("\nAll files uploaded successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
