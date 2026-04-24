import ftplib
import os

# Read .env
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
env_vars = {}
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                env_vars[k] = v

FTP_HOST = env_vars.get("FTP_HOST", "ftp.order-shipwreckbali.com")
FTP_USER = env_vars.get("FTP_USER", "admin@balijapandream.com")
FTP_PASS = env_vars.get("FTP_PASS", "Enrichno1@")

try:
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    
    print("--- /admin/siswa/assets ---")
    ftp.cwd('/admin/siswa/assets')
    ftp.dir()
    
    ftp.quit()
except Exception as e:
    print(f"Error: {e}")
