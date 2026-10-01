import { createFileRoute, Link } from "@tanstack/react-router";

import {
  MapPin,
  Search,
  MessageCircle,
  KeyRound,
  ShieldCheck,
  Heart,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

import { Page } from "@/components/Layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      {
        title: "How It Works — Room Renter",
      },
      {
        name: "description",
        content:
          "Learn how Room Renter helps you find a room, connect with owners and move into your new home.",
      },
    ],
  }),

  component: HowItWorksPage,
});

const steps = [
  {
    number: "01",
    icon: MapPin,
    title: "Set Your Preferences",
    description:
      "Tell us what you're looking for — your preferred location, room type, budget and important amenities.",
  },
  {
    number: "02",
    icon: Search,
    title: "Find Verified Rooms",
    description:
      "Browse available rooms, PGs and flats with property details, photos, amenities and verification information.",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Visit & Connect",
    description:
      "View the property, connect with the owner, ask questions and schedule a visit before making your decision.",
  },
  {
    number: "04",
    icon: KeyRound,
    title: "Agree & Move In",
    description:
      "Discuss the terms, finalize the rental agreement and move into your new home with confidence.",
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: "Verified Listings",
    text: "Get clear property information and verification details before contacting an owner.",
  },
  {
    icon: Heart,
    title: "Save Rooms You Like",
    text: "Save interesting rooms and come back to them later from your Saved Rooms section.",
  },
  {
    icon: MessageCircle,
    title: "Connect With Owners",
    text: "Message owners and discuss the property, availability and visit details.",
  },
  {
    icon: CheckCircle2,
    title: "Make an Informed Choice",
    text: "Compare rent, amenities, location, reviews and property details before moving.",
  },
];

function HowItWorksPage() {
  return (
    <Page>
      <div className="container-page py-10 sm:py-14">
        {/* HERO */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Heart className="h-7 w-7 text-primary" />
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-primary">
            Simple. Transparent. Convenient.
          </p>

          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            How Room Renter Works
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            From finding the right room to connecting with the owner and moving in — Room Renter
            keeps the entire journey simple.
          </p>
        </section>

        {/* STEPS */}
        <section className="mt-14">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div key={step.number} className="card-surface relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>

                    <span className="text-3xl font-bold text-muted-foreground/20">
                      {step.number}
                    </span>
                  </div>

                  <h2 className="mt-6 text-lg font-bold">{step.title}</h2>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* JOURNEY */}
        <section className="mt-14 rounded-3xl bg-muted/50 p-6 sm:p-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold text-primary">YOUR RENTING JOURNEY</p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Everything in one place</h2>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Search, compare, save, connect and move — without jumping between different platforms.
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 md:flex-row">
            {["Search", "Compare", "Save", "Connect", "Move In"].map((item, index, array) => (
              <div key={item} className="flex items-center gap-3">
                <div className="rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold shadow-sm">
                  {item}
                </div>

                {index < array.length - 1 && (
                  <ArrowRight className="hidden h-4 w-4 text-primary md:block" />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* BENEFITS */}
        <section className="mt-14">
          <div className="text-center">
            <p className="text-sm font-semibold text-primary">WHY USE ROOM RENTER</p>

            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Built around your renting experience
            </h2>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className="rounded-2xl border border-border bg-background p-5"
                >
                  <Icon className="h-5 w-5 text-primary" />

                  <h3 className="mt-4 font-semibold">{benefit.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.text}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-3xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to find your next room?</h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 opacity-90">
            Explore available rooms and find a place that fits your budget, lifestyle and location.
          </p>

          <Button asChild variant="secondary" className="mt-6 rounded-xl">
            <Link to="/search" search={{ city: undefined, type: undefined, budget: undefined }}>
              Find a Room
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </Page>
  );
}
