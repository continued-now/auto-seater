'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    q: 'Is this really a one-time payment?',
    a: 'Yes. Pay $14.99 once and you have Pro access forever. No subscription, no renewal, no hidden fees. Use it for this event and every future event.',
  },
  {
    q: 'Do I need to create an account?',
    a: 'No. AutoSeater works entirely in your browser. Your data is stored locally on your device. When you purchase Pro, your access is tied to a Stripe receipt you can use to restore on any device.',
  },
  {
    q: 'What happens to my data?',
    a: 'Your guest list, venue layout, and seating assignments are stored in your browser (IndexedDB + localStorage). Nothing is sent to our servers unless you use AI features. You own your data completely.',
  },
  {
    q: 'Can I use this for multiple events?',
    a: 'Absolutely. AutoSeater supports multiple event projects. Switch between events easily, each with its own guest list, venue, and seating arrangement.',
  },
  {
    q: 'How does the AI Photo-to-Room feature work?',
    a: 'Take a photo of your venue (or use one from the website). AI analyzes the image and generates a floor plan with tables, walls, and fixtures placed accurately. You can then fine-tune the layout.',
  },
  {
    q: 'What if I need a refund?',
    a: "We offer a 30-day money-back guarantee. If AutoSeater doesn't work for your event, email us and we'll refund you immediately. No questions asked.",
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Frequently asked questions
          </h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, i) => (
            <div key={i} className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-sm font-medium text-slate-900 pr-4">{faq.q}</span>
                {openIndex === i ? (
                  <ChevronUp size={16} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400 shrink-0" />
                )}
              </button>
              {openIndex === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
