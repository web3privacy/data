import { exists } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import { run } from "jsr:@libs/run";
import { getImageSize } from "jsr:@retraigo/image-size";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

// Function to check for corresponding images for each .yaml file
async function checkImages(peopleDir, imagesDir) {
    const missingImages = [];
    for await (const entry of Deno.readDir(peopleDir)) {
        if (entry.isFile && entry.name.endsWith('.yaml')) {
            const imageName = entry.name.replace('.yaml', '').toLowerCase();
            const imageFormats = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
            const imageExists = await Promise.all(imageFormats.map(async (ext) => {
                return await exists(join(imagesDir, imageName + ext));
            }));

            if (!imageExists.some(exists => exists)) {
                console.log(`Missing image for: ${entry.name}`);
                missingImages.push(imageName);
            } else {
                console.log(`Found image for: ${entry.name}`);
            }
        }
    }

    if (missingImages.length > 0) {
        throw new Error(`Missing images for: ${missingImages.join(', ')}`);
    }
}

// Function to check for thumbnails
async function checkThumbs(imagesDir) {
    const missingThumbs = [];
    const sizes = { '64px': 64, '128px': 128, '400px': 400 };

    for await (const entry of Deno.readDir(imagesDir)) {
        if (entry.isFile && /\.(jpg|jpeg|png|JPG|JPEG|PNG)$/.test(entry.name)) {
            const name = entry.name.split('.')[0];
            const allThumbsExist = await Promise.all(Object.keys(sizes).map(async (size) => {
                const thumbPath = join(imagesDir, 'thumbs', `${name}-${size}.webp`);
                return await exists(thumbPath);
            }));

            if (!allThumbsExist.every(exists => exists)) {
                console.log(`Missing thumbnails for: ${entry.name}`);
                missingThumbs.push(name);
            } else {
                console.log(`All thumbnails exist for: ${entry.name}`);
            }
        }
    }

    if (missingThumbs.length > 0) {
        await makeThumbs(missingThumbs, imagesDir);
    }
}

// Function to create thumbnails
async function makeThumbs(missingThumbs, imagesDir) {
    const sizes = { '64px': 64, '128px': 128, '400px': 400 };

    // Ensure the thumbs directory exists
    const thumbsDir = join(imagesDir, 'thumbs');
    if (!(await exists(thumbsDir))) {
        await Deno.mkdir(thumbsDir, { recursive: true });
    }

    for (const name of missingThumbs) {
        const imageFormats = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG'];
        let imageBuffer = null;

        // Try to read the image in different formats
        for (const ext of imageFormats) {
            const imagePath = join(imagesDir, `${name}${ext}`);
            if (await exists(imagePath)) {
                imageBuffer = await Deno.readFile(imagePath);
                break; // Exit loop if image is found
            }
        }

        if (!imageBuffer) {
            console.error(`No image found for ${name} in any supported format.`);
            continue; // Skip if no image was found
        }

        // Get image dimensions
        const { width, height } = await getImageSize(imageBuffer).catch(err => {
            console.error(`Error getting size for ${name}:`, err);
            return { width: 0, height: 0 };
        });

        for (const [sizeName, newWidth] of Object.entries(sizes)) {
            const newHeight = Math.round((height / width) * newWidth);
            const resizedImageBuffer = await Image.decode(imageBuffer)
                .then(image => image.resize(newWidth, newHeight).encode('webp'))
                .catch(err => {
                    console.error(`Error resizing image ${name}:`, err);
                    return null;
                });

            if (!resizedImageBuffer) continue;

            // Save the resized image
            const thumbPath = join(imagesDir, 'thumbs', `${name}-${sizeName}.webp`);
            await Deno.writeFile(thumbPath, resizedImageBuffer);
            console.log(`Created thumbnail for ${name} at size ${sizeName}`);
        }
    }
}

// Example usage
const peopleDir = './people'; // Replace with your actual directory
const imagesDir = './images'; // Replace with your actual directory

await checkImages(peopleDir, imagesDir);
await checkThumbs(imagesDir);
