import Link from 'next/link';
import {
  Users,
  LayoutGrid,
  Wand2,
  Camera,
  QrCode,
  Monitor,
  FileText,
  Check,
  ArrowRight,
  Sparkles,
  Mail,
  Shield,
} from 'lucide-react';
import { NavBar } from '@/components/landing/NavBar';
import { FAQSection } from '@/components/landing/FAQSection';
import { EmailCaptureSection } from '@/components/landing/EmailCaptureSection';
import { HeroFloorPlanPreview } from '@/components/landing/HeroFloorPlanPreview';

/* ──────────────────────────────────────────────
   Hero Section (1A + 1F)
   ────────────────────────────────────────────── */

function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-1.5 bg-primary-light text-primary text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Sparkles size={12} />
          No subscription required
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight tracking-tight">
          The seating chart tool that doesn&apos;t charge you monthly<br />
          <span className="text-primary">for a one-day event</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Plan your wedding or event seating in minutes, not hours.
          AI-powered floor plans, drag-and-drop assignments, QR check-in &mdash; all for a one-time fee.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 h-12 px-8 bg-primary text-white text-base font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
          >
            Try Free &mdash; No Sign Up
            <ArrowRight size={16} />
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 h-12 px-8 bg-white text-slate-700 text-base font-medium rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            View Pricing
          </a>
          <Link
            href="/app?demo=true"
            className="inline-flex items-center gap-2 h-12 px-8 bg-white text-primary text-base font-medium rounded-xl border border-primary/20 hover:border-primary/40 hover:bg-primary-light transition-colors"
          >
            See Demo
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Free for up to 50 guests. No credit card needed.
        </p>
        <HeroFloorPlanPreview />
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Features Section
   ────────────────────────────────────────────── */

const FEATURES = [
  {
    icon: Users,
    title: 'Smart Guest Management',
    description:
      'Import from CSV, group into households, tag dietary needs & accessibility requirements. Fuzzy search finds anyone instantly.',
  },
  {
    icon: Camera,
    title: 'AI Photo-to-Room',
    description:
      'Snap a photo of your venue and AI generates an accurate floor plan with tables, walls, and fixtures automatically placed.',
    pro: true,
  },
  {
    icon: Wand2,
    title: 'Auto-Assign Seating',
    description:
      'Set preferences (keep together, keep apart) and let the algorithm seat everyone optimally. Fine-tune with drag-and-drop.',
    pro: true,
  },
  {
    icon: QrCode,
    title: 'QR Check-In',
    description:
      'Generate QR badges for every guest. Scan at the door for instant check-in tracking with a live attendance dashboard.',
  },
  {
    icon: Monitor,
    title: 'TV Display Mode',
    description:
      'Cast a full-screen floor plan to a TV at the venue entrance. Guests find their table at a glance &mdash; no usher needed.',
  },
  {
    icon: FileText,
    title: 'Export Everything',
    description:
      'PDF floor plans, place cards, escort cards, CSV guest lists, and shareable links. Print-ready, no watermarks on Pro.',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-3 text-lg text-slate-500 max-w-xl mx-auto">
            From guest list to day-of check-in &mdash; one tool handles the entire seating workflow.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center mb-4">
                <f.icon size={20} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                {f.title}
                {f.pro && (
                  <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                    PRO
                  </span>
                )}
              </h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   How It Works
   ────────────────────────────────────────────── */

const STEPS = [
  {
    step: '1',
    title: 'Add your guests',
    description: 'Paste from a spreadsheet, import CSV, or type them in. Group into households and tag needs.',
  },
  {
    step: '2',
    title: 'Set up your venue',
    description: 'Drop tables onto a floor plan, or take a photo and let AI do it. Resize rooms, add fixtures.',
  },
  {
    step: '3',
    title: 'Assign seats',
    description: 'Drag guests to tables, or hit auto-assign and let the algorithm handle it. Set keep-together/apart rules.',
  },
  {
    step: '4',
    title: 'Export & check in',
    description: 'Print place cards, share the floor plan link, generate QR badges, and display on a TV at the door.',
  },
];

function HowItWorksSection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Four steps from chaos to calm
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Most users finish their seating chart in under 15 minutes.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-8">
          {STEPS.map((s) => (
            <div key={s.step} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shrink-0">
                {s.step}
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{s.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Pricing Section
   ────────────────────────────────────────────── */

const FREE_FEATURES = [
  'Up to 50 guests',
  '1 room layout',
  'Drag-and-drop seating',
  'Basic PDF export (watermarked)',
  'Shareable floor plan link',
  'QR check-in',
  'TV display mode',
];

const PRO_FEATURES = [
  'Unlimited guests',
  'Multi-room layouts',
  'AI Photo-to-Room generator',
  'AI Layout Advisor',
  'Auto-assign algorithm',
  'Watermark-free exports',
  'Place cards & escort cards',
  'Custom table dimensions',
];

function PricingSection() {
  return (
    <section id="pricing" className="py-20 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Simple pricing. No surprises.
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Pay once, use forever. No monthly fees for a one-day event.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free tier */}
          <div className="bg-white rounded-xl border border-slate-200 p-8">
            <h3 className="text-lg font-semibold text-slate-900">Free</h3>
            <div className="mt-3">
              <span className="text-4xl font-bold text-slate-900">$0</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">Perfect for small events</p>
            <Link
              href="/app"
              className="mt-6 inline-flex items-center justify-center w-full h-11 bg-white text-slate-700 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              Start Free
            </Link>
            <ul className="mt-6 space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className="text-slate-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro tier */}
          <div className="bg-white rounded-xl border-2 border-primary p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
              Most Popular
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Pro</h3>
            <div className="mt-3">
              <span className="text-4xl font-bold text-slate-900">$14.99</span>
              <span className="text-sm text-slate-500 ml-1">one-time</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">For weddings & large events</p>
            <Link
              href="/app"
              className="mt-6 inline-flex items-center justify-center w-full h-11 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition-colors"
            >
              Get Pro
            </Link>
            <ul className="mt-6 space-y-3">
              <li className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Everything in Free, plus:
              </li>
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check size={16} className="text-primary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Competitor Comparison Table (1C)
   ────────────────────────────────────────────── */

const COMPETITORS = [
  { name: 'Typical SaaS A', pricing: '$29/mo', guestLimit: '100', ai: 'Add-on' },
  { name: 'Typical SaaS B', pricing: '$49/mo', guestLimit: '250', ai: 'None' },
  { name: 'Enterprise tools', pricing: '$99+/mo', guestLimit: 'Unlimited', ai: 'Enterprise' },
];

function ComparisonSection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            How AutoSeater compares
          </h2>
          <p className="mt-3 text-lg text-slate-500">
            Stop paying monthly for a tool you use once.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 font-medium text-slate-500">Tool</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Pricing</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">Guest Limit</th>
                <th className="text-left py-3 px-4 font-medium text-slate-500">AI Features</th>
              </tr>
            </thead>
            <tbody>
              {COMPETITORS.map((c) => (
                <tr key={c.name} className="border-b border-slate-100">
                  <td className="py-3 px-4 text-slate-600">{c.name}</td>
                  <td className="py-3 px-4 text-slate-600">{c.pricing}</td>
                  <td className="py-3 px-4 text-slate-600">{c.guestLimit}</td>
                  <td className="py-3 px-4 text-slate-600">{c.ai}</td>
                </tr>
              ))}
              {/* AutoSeater row — highlighted */}
              <tr className="border-l-4 border-l-primary bg-primary-light/50">
                <td className="py-3 px-4 font-semibold text-slate-900">AutoSeater</td>
                <td className="py-3 px-4 font-semibold text-slate-900">$14.99 once</td>
                <td className="py-3 px-4 font-semibold text-slate-900">Unlimited (Pro)</td>
                <td className="py-3 px-4 font-semibold text-slate-900">Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   CTA Section
   ────────────────────────────────────────────── */

function CTASection() {
  return (
    <section className="py-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
          Ready to plan your seating?
        </h2>
        <p className="mt-4 text-lg text-slate-500">
          Start for free with up to 50 guests. Upgrade anytime for $14.99 &mdash; one time, forever.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 h-12 px-8 bg-primary text-white text-base font-medium rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
          >
            Start Planning Free
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────
   Footer (1E — expanded 3-column)
   ────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-slate-100 py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto grid sm:grid-cols-3 gap-8">
        {/* Logo + tagline */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 bg-primary rounded flex items-center justify-center">
              <LayoutGrid size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-800">AutoSeater</span>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            The seating chart tool that doesn&apos;t charge you monthly for a one-day event. Pay once, use forever.
          </p>
        </div>

        {/* Product links */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Product</h4>
          <ul className="space-y-2">
            <li><a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a></li>
            <li><a href="#pricing" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Pricing</a></li>
            <li><a href="#faq" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">FAQ</a></li>
            <li><Link href="/app" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Open App</Link></li>
          </ul>
        </div>

        {/* Support links */}
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Support</h4>
          <ul className="space-y-2">
            <li className="flex items-center gap-1.5 text-sm text-slate-600">
              <Mail size={13} className="text-slate-400" />
              <a href="mailto:support@autoseater.com" className="hover:text-slate-900 transition-colors">support@autoseater.com</a>
            </li>
            <li className="flex items-center gap-1.5 text-sm text-slate-600">
              <Shield size={13} className="text-slate-400" />
              <span>30-day refund guarantee</span>
            </li>
            <li><a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Terms of Service</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-slate-100">
        <p className="text-xs text-slate-400 text-center">
          &copy; {new Date().getFullYear()} AutoSeater. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ──────────────────────────────────────────────
   JSON-LD
   ────────────────────────────────────────────── */

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AutoSeater',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Web',
  offers: [
    {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      name: 'Free',
      description: 'Up to 50 guests with basic features',
    },
    {
      '@type': 'Offer',
      price: '14.99',
      priceCurrency: 'USD',
      name: 'Pro',
      description: 'Unlimited guests, AI features, premium exports',
    },
  ],
  description:
    'AI-powered seating chart maker for weddings and events. Drag-and-drop assignments, QR check-in, TV display mode.',
  aggregateRating: undefined,
};

/* ──────────────────────────────────────────────
   Page (server component)
   ────────────────────────────────────────────── */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <NavBar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <ComparisonSection />
      <FAQSection />
      <EmailCaptureSection />
      <CTASection />
      <Footer />
    </div>
  );
}
