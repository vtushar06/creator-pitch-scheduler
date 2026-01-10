// Ghibli-style mentor profiles with images
import mentor1 from '../images/mentor_1.jpeg';
import mentor2 from '../images/mentor_2.jpeg';
import mentor3 from '../images/mentor_3.jpeg';
import mentor4 from '../images/mentor_4.jpeg';
import mentor5 from '../images/mentor_5.jpeg';
import mentor6 from '../images/mentor_6.jpeg';
import mentor7 from '../images/mentor_7.jpeg';
import mentor8 from '../images/mentor_8.jpeg';
import mentor9 from '../images/mentor_9.jpeg';
import mentor10 from '../images/mentor_10.jpeg';

export interface Mentor {
  id: number;
  name: string;
  role: string;
  image: string;
  specialty: string;
}

export const MENTORS: Mentor[] = [
  {
    id: 1,
    name: 'Hayao Miyazaki',
    role: 'Animation Director',
    image: mentor1,
    specialty: 'Storytelling & Direction'
  },
  {
    id: 2,
    name: 'Isao Takahata',
    role: 'Film Director',
    image: mentor2,
    specialty: 'Character Development'
  },
  {
    id: 3,
    name: 'Toshio Suzuki',
    role: 'Producer',
    image: mentor3,
    specialty: 'Production & Strategy'
  },
  {
    id: 4,
    name: 'Joe Hisaishi',
    role: 'Composer',
    image: mentor4,
    specialty: 'Music & Sound Design'
  },
  {
    id: 5,
    name: 'Hiromasa Yonebayashi',
    role: 'Animation Director',
    image: mentor5,
    specialty: 'Visual Aesthetics'
  },
  {
    id: 6,
    name: 'Goro Miyazaki',
    role: 'Director',
    image: mentor6,
    specialty: 'World Building'
  },
  {
    id: 7,
    name: 'Yoshifumi Kondo',
    role: 'Character Designer',
    image: mentor7,
    specialty: 'Character Animation'
  },
  {
    id: 8,
    name: 'Kazuo Oga',
    role: 'Art Director',
    image: mentor8,
    specialty: 'Background Art'
  },
  {
    id: 9,
    name: 'Michiyo Yasuda',
    role: 'Color Designer',
    image: mentor9,
    specialty: 'Color Theory'
  },
  {
    id: 10,
    name: 'Katsuya Kondo',
    role: 'Lead Animator',
    image: mentor10,
    specialty: 'Motion & Timing'
  }
];
