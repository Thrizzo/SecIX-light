import React, { useState, useEffect } from "react";
import {
  Shield,
  ArrowRight,
  FileText,
  AlertTriangle,
  Layers,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Sun,
  Moon,
  Heart,
  Server,
  Lock,
  Globe,
  Container,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RequestAccessDialog } from "@/components/home/RequestAccessDialog";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: AlertTriangle,
    title: "Comprehensive Risk Management",
    description:
      "End-to-end risk lifecycle management with intelligent risk assessments, heat maps, treatment plans, and real-time monitoring dashboards.",
    highlights: ["Risk appetite framework", "Heat map visualization", "Treatment tracking", "Risk register"],
  },
  {
    icon: Shield,
    title: "Threat Assessments",
    description:
      "Identify, analyze, and prioritize threats with structured threat modeling. Map threats to assets and controls for comprehensive security coverage.",
    highlights: ["Threat modeling", "Attack surface analysis", "Threat intelligence", "Mitigation planning"],
  },
  {
    icon: Layers,
    title: "Multi-Framework Control Forge",
    description:
      "Support for NIST, ISO 27001, CIS Controls, and more. Map controls across frameworks, identify gaps, and demonstrate compliance effortlessly.",
    highlights: ["Framework crosswalks", "Control mapping", "Gap analysis", "Evidence management"],
  },
  {
    icon: FileText,
    title: "Asset Management",
    description:
      "Maintain a complete inventory of your information assets. Track ownership, classification, and relationships across your organization.",
    highlights: ["Asset inventory", "Classification levels", "Dependency mapping", "Lifecycle tracking"],
  },
  {
    icon: Heart,
    title: "BCM Module",
    description:
      "Business Continuity Management to ensure organizational resilience. Plan for disruptions, maintain operations, and recover quickly from incidents.",
    highlights: ["BIA assessments", "Continuity planning", "Recovery strategies", "Testing schedules"],
  },
  {
    icon: Lock,
    title: "Data Protection Module",
    description:
      "Comprehensive data protection and privacy management. Ensure compliance with GDPR, data classification, and privacy impact assessments.",
    highlights: ["Data inventory", "Privacy assessments", "Consent management", "Breach response"],
  },
];

// Floating grid animation component - Hack The Box style
const FloatingGrid: React.FC = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Continuous grid movement animation
  useEffect(() => {
    let animationFrame: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      setOffset({
        x: Math.sin(elapsed * 0.3) * 20 + elapsed * 5,
        y: Math.cos(elapsed * 0.2) * 15 + elapsed * 3,
      });
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Primary animated grid layer */}
      <div
        className="absolute inset-[-100%] htb-grid opacity-20"
        style={{
          transform: `translate(${offset.x + mousePos.x * 0.02}px, ${offset.y + mousePos.y * 0.02}px)`,
        }}
      />

      {/* Secondary grid layer - moves opposite direction for depth */}
      <div
        className="absolute inset-[-100%] htb-grid-secondary opacity-10"
        style={{
          transform: `translate(${-offset.x * 0.5 + mousePos.x * 0.01}px, ${-offset.y * 0.5 + mousePos.y * 0.01}px)`,
        }}
      />

      {/* Grid intersection glow points */}
      <div className="absolute inset-0">
        {[...Array(12)].map((_, i) => (
          <div
            key={`glow-${i}`}
            className="absolute w-2 h-2 rounded-full bg-primary/60 htb-glow-point"
            style={{
              top: `${10 + (i % 4) * 25}%`,
              left: `${15 + Math.floor(i / 4) * 30}%`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </div>

      {/* Scanning line effect */}
      <div className="absolute inset-0 htb-scan-line" />

      {/* Gradient orbs */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full blur-3xl bg-primary/10 animate-float"
        style={{ top: "10%", left: "20%", animationDelay: "0s" }}
      />
      <div
        className="absolute w-[400px] h-[400px] rounded-full blur-3xl bg-accent/10 animate-float"
        style={{ top: "50%", right: "10%", animationDelay: "2s" }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-3xl bg-primary/5 animate-float"
        style={{ bottom: "10%", left: "30%", animationDelay: "4s" }}
      />

      {/* Floating particles */}
      {[...Array(30)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-primary/50 htb-particle"
          style={{
            width: `${1 + Math.random() * 2}px`,
            height: `${1 + Math.random() * 2}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${6 + Math.random() * 6}s`,
          }}
        />
      ))}

      {/* Corner accent lines */}
      <div className="absolute top-0 left-0 w-32 h-32">
        <div className="absolute top-8 left-0 w-16 h-px bg-gradient-to-r from-primary/50 to-transparent htb-corner-line" />
        <div className="absolute top-0 left-8 h-16 w-px bg-gradient-to-b from-primary/50 to-transparent htb-corner-line" />
      </div>
      <div className="absolute top-0 right-0 w-32 h-32">
        <div
          className="absolute top-8 right-0 w-16 h-px bg-gradient-to-l from-primary/50 to-transparent htb-corner-line"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute top-0 right-8 h-16 w-px bg-gradient-to-b from-primary/50 to-transparent htb-corner-line"
          style={{ animationDelay: "0.5s" }}
        />
      </div>
      <div className="absolute bottom-0 left-0 w-32 h-32">
        <div
          className="absolute bottom-8 left-0 w-16 h-px bg-gradient-to-r from-primary/50 to-transparent htb-corner-line"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-0 left-8 h-16 w-px bg-gradient-to-t from-primary/50 to-transparent htb-corner-line"
          style={{ animationDelay: "1s" }}
        />
      </div>
      <div className="absolute bottom-0 right-0 w-32 h-32">
        <div
          className="absolute bottom-8 right-0 w-16 h-px bg-gradient-to-l from-primary/50 to-transparent htb-corner-line"
          style={{ animationDelay: "1.5s" }}
        />
        <div
          className="absolute bottom-0 right-8 h-16 w-px bg-gradient-to-t from-primary/50 to-transparent htb-corner-line"
          style={{ animationDelay: "1.5s" }}
        />
      </div>
    </div>
  );
};

const Homepage: React.FC = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Check for saved preference or system preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "light" || (!savedTheme && !prefersDark)) {
      setIsDark(false);
      document.documentElement.classList.add("light");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (isDark) {
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    }
  };

  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <FloatingGrid />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-display font-bold text-foreground">SecIX</span>
          </div>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="rounded-full">
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            <RequestAccessDialog>
              <Button variant="outline" size="sm">
                Request Access
              </Button>
            </RequestAccessDialog>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered GRC Platform</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground leading-tight mb-6 animate-slide-up">
            Governance, Risk & <span className="text-gradient">Compliance</span>
            <br />
            Reimagined
          </h1>

          <p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 animate-slide-up"
            style={{ animationDelay: "0.1s" }}
          >
            Unify your security management with intelligent automation, multi-framework compliance, and AI-driven
            insights that transform how you manage risk.
          </p>

          {/* Made with care tagline */}
          <div
            className="flex items-center justify-center gap-2 mb-10 animate-slide-up"
            style={{ animationDelay: "0.15s" }}
          >
            <Heart className="w-4 h-4 text-primary fill-primary" />
            <span className="text-sm text-muted-foreground">
              Made with care by infosec professionals, for infosec professionals
            </span>
          </div>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            <RequestAccessDialog>
              <Button size="lg" className="gap-2 px-8">
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </RequestAccessDialog>
            <Button variant="outline" size="lg" className="gap-2 px-8" onClick={scrollToFeatures}>
              Explore Features
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Everything You Need for <span className="text-gradient">Enterprise Security</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A comprehensive platform that brings together governance, risk management, and compliance in one unified
              experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative p-8 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>

                  <h3 className="text-xl font-display font-semibold text-foreground mb-3">{feature.title}</h3>

                  <p className="text-muted-foreground mb-6">{feature.description}</p>

                  <div className="grid grid-cols-2 gap-2">
                    {feature.highlights.map((highlight, hIndex) => (
                      <div key={hIndex} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                        <span className="text-muted-foreground">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security First Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-6">
              <Lock className="w-4 h-4 text-accent" />
              <span className="text-sm font-medium text-accent">Built with Security First in Mind</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
              Your Data, Your <span className="text-gradient">Infrastructure</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Full control over your deployment with enterprise-grade security features and complete data sovereignty.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* On-Premise Deployment */}
            <div className="group p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 text-center">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Server className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">On-Premise Deployment</h3>
              <p className="text-sm text-muted-foreground">
                Fully deploy on your own infrastructure with all AI features included. No cloud dependency required.
              </p>
            </div>

            {/* Data Sovereignty */}
            <div className="group p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 text-center">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Globe className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Data Sovereignty</h3>
              <p className="text-sm text-muted-foreground">
                Keep your sensitive GRC data within your jurisdiction. Full compliance with data residency requirements.
              </p>
            </div>

            {/* Docker Support */}
            <div className="group p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 text-center">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Container className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Docker Ready</h3>
              <p className="text-sm text-muted-foreground">
                Production-ready Docker images available on GHCR. Simple deployment with docker-compose.
              </p>
            </div>

            {/* Kubernetes Support */}
            <div className="group p-6 rounded-2xl bg-card/50 border border-border/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 text-center">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Layers className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-lg font-display font-semibold text-foreground mb-2">Kubernetes Ready</h3>
              <p className="text-sm text-muted-foreground">
                Full Kubernetes manifests included. Scale horizontally with Helm charts and GitOps support.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6">
            Ready to Test the Newest <span className="text-gradient">GRC Platform?</span>
          </h2>
          <RequestAccessDialog>
            <Button size="lg" className="gap-2 px-10 py-6 text-lg">
              Request Access Today
              <ArrowRight className="w-5 h-5" />
            </Button>
          </RequestAccessDialog>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-border/50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-display font-semibold text-foreground">SecIX</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} SecIX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
