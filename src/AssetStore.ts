export const TEXTURES = {
    // Base sprites
    transparent: 'assets/transparent.png',

    // Planet orbit sprites
    planetSun: 'assets/sun.png',
    planetMercury: 'assets/mercury.png',
    planetVenus: 'assets/venus.png',
    planetEarth: 'assets/earth.png',
    planetMars: 'assets/mars.png',
    planetJupiter: 'assets/jupiter.png',
    planetSaturn: 'assets/saturn.png',
    planetUranus: 'assets/uranus.png',
    planetNeptune: 'assets/neptune.png',
};

type TextureMap = Record<string, ImageBitmap>;

export default class AssetStore {
    private static textures: TextureMap = {};

    /**
     * Loads a PNG texture from the assets folder and stores it by name.
     * @param name The key to reference the texture
     * @param src Path to the PNG file (relative to your project)
     */
    static async loadTexture(name: keyof typeof TEXTURES, src: string): Promise<void> {
        const img = new Image();
        img.src = src;
        await img.decode();

        console.log(`Loaded texture: ${src}`);

        const bitmap = await createImageBitmap(img);
        this.textures[name] = bitmap;
    }

    /** Retrieves a texture by name */
    static getTexture(name: keyof typeof TEXTURES): ImageBitmap {
        const texture = this.textures[name];

        if (!texture) {
            throw new Error(`Texture "${name}" not found!`);
        }

        return texture;
    }

    /** Preload multiple textures at once */
    static async loadTextures(): Promise<void> {
        const promises: Promise<void>[] = [];

        for (const key in TEXTURES) {
            if (!Object.prototype.hasOwnProperty.call(TEXTURES, key)) {
                continue;
            }

            const name = key as keyof typeof TEXTURES;
            promises.push(this.loadTexture(name, TEXTURES[name]));
        }

        await Promise.all(promises);
    }
}
