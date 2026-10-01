import { useEffect, useMemo, useState } from "react";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type ReviewRow = {
  id: number;
  property_id: number;
  renter_id: string;
  reviewer_id: string;
};

export function PropertyReviews({
  propertyId,
  landlordId,
  initialRating,
  initialReviewCount,
}: {
  propertyId: number;
  landlordId?: string;
  initialRating: number;
  initialReviewCount: number;
}) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [saving, setSaving] = useState(false);

  const numericPropertyId = Number(propertyId);

  const loadReviews = async () => {
    if (!Number.isFinite(numericPropertyId)) {
      console.error("Invalid property ID:", propertyId);
      setReviews([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("property_reviews")
      .select(
        "id, property_id, renter_id, reviewer_id, reviewer_name, rating, review, created_at, updated_at",
      )

      .eq("property_id", numericPropertyId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Property reviews:", error);
      setReviews([]);
      setLoading(false);
      return;
    }

    setReviews(
      (data ?? []).map((row) => ({
        ...row,
        reviewer_name: row.reviewer_name || "Verified Renter",
      })) as ReviewRow[],
    );

    setLoading(false);
  };

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUserId(user?.id ?? null);
      }

      await loadReviews();
    };

    void init();

    return () => {
      mounted = false;
    };
  }, [propertyId]);

  const stats = useMemo(() => {
    const count = reviews.length || initialReviewCount;

    const average =
      reviews.length > 0
        ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length
        : initialRating;

    return {
      count,
      average: Number.isFinite(average) ? Number(average.toFixed(1)) : 0,
      breakdown: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((item) => item.rating === star).length,
      })),
    };
  }, [reviews, initialRating, initialReviewCount]);

  const ownReview = reviews.find((review) => review.reviewer_id === userId);

  useEffect(() => {
    if (ownReview) {
      setRating(ownReview.rating);
      setReviewText(ownReview.review ?? "");
    }
  }, [ownReview?.id]);

  const saveReview = async () => {
    /*
     * IMPORTANT:
     * property_reviews.property_id is NOT NULL.
     * Never allow an invalid property ID to reach Supabase.
     */
    if (!Number.isFinite(numericPropertyId)) {
      console.error("❌ Cannot submit review. Invalid property ID:", propertyId);

      toast.error("Could not identify this property.");
      return;
    }

    if (!userId) {
      toast.error("Please log in to leave a review.");
      return;
    }

    if (landlordId && userId === landlordId) {
      toast.error("Landlords cannot review their own property.");
      return;
    }

    if (rating < 1 || rating > 5) {
      toast.error("Please select a rating from 1 to 5 stars.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Please log in to leave a review.");
        return;
      }

      const reviewerName =
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Verified Renter";

      const payload = {
        property_id: numericPropertyId,

        // Existing database column
        renter_id: user.id,

        // Used by our RLS policy
        reviewer_id: user.id,

        reviewer_name: reviewerName,
        rating,
        review: reviewText.trim() || null,
      };

      console.log("📝 Submitting property review:", payload);

      let error = null;

      if (ownReview) {
        const result = await supabase
          .from("property_reviews")
          .update({
            reviewer_name: payload.reviewer_name,
            rating: payload.rating,
            review: payload.review,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ownReview.id)
          .eq("property_id", numericPropertyId)
          .eq("reviewer_id", user.id);

        error = result.error;
      } else {
        const result = await supabase.from("property_reviews").insert(payload);

        error = result.error;
      }

      if (error) {
        console.error("❌ Save review error:", error);
        toast.error(error.message || "Could not save your review.");
        return;
      }

      toast.success(ownReview ? "Review updated." : "Thanks for your review!");

      setReviewText("");

      await loadReviews();
    } catch (error) {
      console.error("❌ Unexpected review error:", error);

      toast.error(error instanceof Error ? error.message : "Could not save your review.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h2 className="text-lg font-bold">Real renter ratings & reviews</h2>

      <div className="mt-3 grid gap-5 rounded-2xl border border-border p-5 sm:grid-cols-[160px_1fr]">
        <div className="text-center sm:text-left">
          <p className="text-4xl font-extrabold">{stats.average || "—"}</p>

          <p className="mt-1 text-sm text-muted-foreground">
            {stats.count} {stats.count === 1 ? "review" : "reviews"}
          </p>

          <div className="mt-2 flex justify-center gap-0.5 sm:justify-start">
            {[1, 2, 3, 4, 5].map((number) => (
              <Star
                key={number}
                className={cn(
                  "h-4 w-4",
                  number <= Math.round(stats.average) ? "fill-warning text-warning" : "text-border",
                )}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {stats.breakdown.map((item) => {
            const percentage = stats.count > 0 ? (item.count / stats.count) * 100 : 0;

            return (
              <div key={item.star} className="flex items-center gap-3">
                <span className="w-8 text-sm text-muted-foreground">{item.star}★</span>

                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                </div>

                <span className="w-8 text-right text-xs font-medium">{item.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {userId && userId !== landlordId && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-5">
          <h3 className="font-semibold">
            {ownReview ? "Update your review" : "Rate this property"}
          </h3>

          <div className="mt-3 flex gap-1" aria-label="Choose rating">
            {[1, 2, 3, 4, 5].map((number) => (
              <button
                key={number}
                type="button"
                onClick={() => setRating(number)}
                aria-label={`${number} star`}
              >
                <Star
                  className={cn(
                    "h-7 w-7 transition-transform hover:scale-110",
                    number <= rating ? "fill-warning text-warning" : "text-border",
                  )}
                />
              </button>
            ))}
          </div>

          <Textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Share your experience with this room and owner..."
            className="mt-4 min-h-24"
            maxLength={1000}
          />

          <Button className="mt-3 rounded-xl" onClick={saveReview} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}

            {ownReview ? "Update review" : "Submit review"}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading real reviews...
        </div>
      ) : reviews.length > 0 ? (
        <div className="mt-5 space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="card-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">{review.reviewer_name}</p>

                  <p className="text-xs text-muted-foreground">
                    Renter · {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />

                  <span className="text-sm font-semibold">{review.rating}</span>
                </div>
              </div>

              {review.review && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {review.review}
                </p>
              )}
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="font-medium">No renter reviews yet</p>

          <p className="mt-1 text-sm text-muted-foreground">
            Be the first verified renter to rate this property.
          </p>
        </div>
      )}
    </section>
  );
}
