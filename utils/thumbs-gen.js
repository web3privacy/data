import { exists } from "jsr:@std/fs";
import { join } from "jsr:@std/path";
import { run } from "jsr:@libs/run";
import { getImageSize } from "jsr:@retraigo/image-size";
import { imageToWebP } from "jsr:@epi/image-to-webp";
import { Image } from "jsr:@matmen/imagescript";

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

    for (const name of missingThumbs) {
        const imagePath = join(imagesDir, `${name}.jpg`); // Adjust based on your image format
        const imageBuffer = await Deno.readFile(imagePath);
        
        // Get image dimensions
        const { width, height } = await getImageSize(imageBuffer);
        // resizing images to three specific widths
        for (const [sizeName, width] of Object.entries(sizes)) {
            const height = Math.round((height / width) * width);
            const resizedImage = await Image.fromBuffer(imageBuffer).resize(width, height).toBuffer();
        // converting images to webo format
            const webpBuffer = await imageToWebP(resizedImage);
            const outputPath = join(imagesDir, 'thumbs', `${name}-${sizeName}.webp`);
            await Deno.writeFile(outputPath, webpBuffer);
            console.log(`Thumbnail created: ${outputPath}`);
        }
    }
}

// const pointing to the desired directories in project
const peopleDir = './src/people';
const imagesDir = join(peopleDir, '_images');

await checkImages(peopleDir, imagesDir);
await checkThumbs(imagesDir);
