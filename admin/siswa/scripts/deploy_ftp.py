import ftplib
import os

# Read .env manually to avoid extra dependencies
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
FTP_PASS = env_vars.get("FTP_PASS", "")
REMOTE_DIR = "admin/siswa"
LOCAL_DIR = "dist"

def upload_directory(ftp, local_dir, remote_dir):
    try:
        ftp.cwd(remote_dir)
    except ftplib.error_perm:
        try:
            ftp.mkd(remote_dir)
            ftp.cwd(remote_dir)
        except Exception as e:
            print(f"Error creating/changing to directory {remote_dir}: {e}")
            return

    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        if os.path.isfile(local_path):
            with open(local_path, "rb") as f:
                print(f"Uploading {local_path} -> {remote_dir}/{item}")
                ftp.storbinary(f"STOR {item}", f)
        elif os.path.isdir(local_path):
            print(f"Directory {local_path} -> {remote_dir}/{item}")
            upload_directory(ftp, local_path, item)
            # go back to parent
            ftp.cwd("..")

try:
    print(f"Connecting to {FTP_HOST}...")
    ftp = ftplib.FTP(FTP_HOST)
    ftp.login(FTP_USER, FTP_PASS)
    print("Connected. Starting upload...")
    
    # Check if the target remote dir exists from root
    ftp.cwd('/')
    upload_directory(ftp, LOCAL_DIR, REMOTE_DIR)
    
    ftp.quit()
    print("Upload completed successfully.")
except Exception as e:
    print(f"Error during FTP upload: {e}")
