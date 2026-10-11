import {getViteConfig} from 'astro/config';
export default getViteConfig({test:{include:['scripts/qa/**/*.test.ts']}});
