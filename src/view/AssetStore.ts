export const TEXTURES = {
    // Base sprites
    transparent: 'assets/transparent.png',
    blackHole: 'assets/black-hole.png',

    // Planet orbit sprites
    planetSun: 'assets/sun.png',
    blueStar: 'assets/blue-star.png',
    planetMercury: 'assets/mercury.png',
    planetVenus: 'assets/venus.png',
    planetEarth: 'assets/earth.png',
    planetMars: 'assets/mars.png',
    planetJupiter: 'assets/jupiter.png',
    planetSaturn: 'assets/saturn.png',
    planetUranus: 'assets/uranus.png',
    planetNeptune: 'assets/neptune.png',
    alphaCentauriA: 'assets/alpha-centauri-a.png',
    alphaCentauriB: 'assets/alpha-centauri-b.png',
    proximaCentauri: 'assets/proxima-centauri.png',
    proximaCentauriB: 'assets/proxima-centauri-b.png',
    proximaCentauriD: 'assets/proxima-centauri-d.png',

    // Moon orbit sprites
    moonLuna: 'assets/moon-luna.png',
    moonPhobos: 'assets/moon-phobos.png',
    moonDeimos: 'assets/moon-deimos.png',
    moonIo: 'assets/moon-io.png',
    moonEuropa: 'assets/moon-europa.png',
    moonGanymede: 'assets/moon-ganymede.png',
    moonCallisto: 'assets/moon-callisto.png',
    moonTitan: 'assets/moon-titan.png',
    moonEnceladus: 'assets/moon-enceladus.png',
    moonRhea: 'assets/moon-rhea.png',
    moonIapetus: 'assets/moon-iapetus.png',
    moonMiranda: 'assets/moon-miranda.png',
    moonAriel: 'assets/moon-ariel.png',
    moonUmbriel: 'assets/moon-umbriel.png',
    moonTitania: 'assets/moon-titania.png',
    moonOberon: 'assets/moon-oberon.png',
    moonTriton: 'assets/moon-triton.png',
};

type TextureMap = Record<string, ImageBitmap>;
export type TextureName = keyof typeof TEXTURES;

export default class AssetStore {
    private static textures: TextureMap = {};

    /**
     * Loads a PNG texture from the assets folder and stores it by name.
     * @param name The key to reference the texture
     * @param src Path to the PNG file (relative to your project)
     */
    static async loadTexture(name: TextureName, src: string): Promise<void> {
        const img = new Image();
        img.src = src;
        await img.decode();

        console.log(`Loaded texture: ${src}`);

        const bitmap = await createImageBitmap(img);
        this.textures[name] = bitmap;
    }

    /** Retrieves a texture by name */
    static getTexture(name: TextureName): ImageBitmap {
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

            const name = key as TextureName;
            promises.push(this.loadTexture(name, TEXTURES[name]));
        }

        await Promise.all(promises);
    }
}
