import { readFileSync, writeFileSync } from "fs";

const fonts = [
	{
		name: "Poppins",
		weight: 400,
        style: 'normal',
		path: "./fonts/Poppins-Regular.ttf",
	},
    {
		name: "Poppins",
		weight: 500,
        style: 'normal',
		path: "./fonts/Poppins-Medium.ttf",
	},
	{
		name: "Poppins",
		weight: 700,
        style: 'normal',
		path: "./fonts/Poppins-Bold.ttf",
	},

    {
		name: "Poppins",
		weight: 400,
        style: 'italic',
		path: "./fonts/Poppins-Italic.ttf",
	},
    {
		name: "Poppins",
		weight: 500,
        style: 'italic',
		path: "./fonts/Poppins-MediumItalic.ttf",
	},
	{
		name: "Poppins",
		weight: 700,
        style: 'italic',
		path: "./fonts/Poppins-BoldItalic.ttf",
	},
];

const outputLines: string[] = [];

fonts.forEach((font) => {
	const base64 = readFileSync(font.path).toString("base64");
	outputLines.push(`const ${font.name}${font.weight}${font.style}Base64 = Buffer.from("${base64}", 'base64')`);
});

outputLines.push('import type { FontOptions } from "satori";');
outputLines.push('export const fonts = [')
fonts.forEach((font) => {
	outputLines.push(`{
        name: "${font.name}",
        weight: ${font.weight},
        style: "${font.style}",
        data: ${font.name}${font.weight}${font.style}Base64,
    },`);
});
outputLines.push('] as FontOptions[];');

writeFileSync("../src/fonts.ts", outputLines.join("\n"));
console.log("✅ fonts.ts generated!");
