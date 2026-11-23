import { notFound } from 'next/navigation';

// Any address under a language that matches no page renders that language's 404.
export default function CatchAll() {
  notFound();
}
