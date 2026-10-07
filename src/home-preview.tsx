import { createRoot } from 'react-dom/client';
import HomePreview from './app/components/home/HomePreview';
import './styles/home.css';
import '@fontsource/anton/latin-400.css';
import './styles/home-pastel.css';
import './styles/finance-preview.css';
import './styles/home-editorial.css';
import './styles/home-controls.css';
import './styles/home-papercut.css';
import './styles/home-brutalist.css';
import './styles/home-collage.css';

createRoot(document.getElementById('root')!).render(<HomePreview />);
