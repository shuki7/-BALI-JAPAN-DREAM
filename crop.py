from PIL import Image, ImageChops

def trim(im):
    # Get the background color from the top-left corner
    bg_color = im.getpixel((0,0))
    # Create a background image of the same size and color
    bg = Image.new(im.mode, im.size, bg_color)
    # Get the difference
    diff = ImageChops.difference(im, bg)
    # Exaggerate the difference slightly to avoid precision issues
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        return im.crop(bbox)
    return im

file_path = "images/BJD_Logo_Neonbox (1).webp"
im = Image.open(file_path).convert("RGBA")
# Try cropping based on top-left pixel
cropped = trim(im)

# If it's transparent, we can also try standard getbbox() on the alpha channel
alpha = cropped.split()[-1]
bbox = alpha.getbbox()
if bbox:
    cropped = cropped.crop(bbox)

cropped.save(file_path, "WEBP", quality=95)
print("Cropped successfully!")
