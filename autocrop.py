from PIL import Image

file_path = 'images/BJD_Logo_Neonbox (1).webp'
img = Image.open(file_path).convert('RGB')
gray = img.convert('L')

# We want non-white pixels (< 252 to handle slight jpeg artifacts) to become exactly white (255)
# so getbbox captures them. Pure white pixels become 0.
mask = gray.point(lambda p: 255 if p < 252 else 0)
bbox = mask.getbbox()

if bbox:
    print(f"Original size: {img.size}")
    print(f"Bbox: {bbox}")
    cropped = img.crop(bbox)
    print(f"New size: {cropped.size}")
    # Add a little padding back (e.g. 5%)
    w, h = cropped.size
    pad_x, pad_y = int(w*0.05), int(h*0.05)
    padded = Image.new('RGB', (w + 2*pad_x, h + 2*pad_y), (255, 255, 255))
    padded.paste(cropped, (pad_x, pad_y))
    padded.save(file_path, 'WEBP', quality=95)
    print("Saved successfully with a tight crop and 5% padding!")
else:
    print("No bounding box found.")
