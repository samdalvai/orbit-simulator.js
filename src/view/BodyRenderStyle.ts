export type BodyRenderStyle = {
    fillColor: string;
    texture: ImageBitmap | null;
    label: string;
    labelColor: string;
    labelFontSize: number;
};

export const DEFAULT_BODY_RENDER_STYLE: BodyRenderStyle = {
    fillColor: 'white',
    texture: null,
    label: '',
    labelColor: 'white',
    labelFontSize: 12,
};
