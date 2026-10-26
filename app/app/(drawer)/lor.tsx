import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  AddRowButton,
  ErrorNote,
  Field,
  IntroNote,
  LoadErrorBanner,
  RowCard,
  SaveBar,
  savedTimeNote,
  YesNoQuestion,
} from "@/components/sif-form";
import { Toast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/context/auth-context";
import {
  EMPTY_LOR_RECOMMENDER,
  fetchMySif,
  updateMySif,
  type LorRecommender,
  type YesNo,
} from "@/lib/sif-api";

// LOR tab — first asks whether the student needs help with their LOR; the
// "Details Required for Letter of Recommendation" form only shows on Yes.
// Saves only sif.lorAssistance (+ sif.lor on Yes) — the server merges sections.
export default function LorScreen() {
  const { token } = useAuth();

  const [assist, setAssist] = useState<YesNo>("");
  const [lor, setLor] = useState<LorRecommender[]>([
    { ...EMPTY_LOR_RECOMMENDER },
  ]);
  const baselineRef = useRef(
    JSON.stringify({ assist: "", lor: [EMPTY_LOR_RECOMMENDER] }),
  );
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoadError(false);
    fetchMySif(token)
      .then((data) => {
        if (cancelled) return;
        const next = data.lor.length
          ? data.lor
          : [{ ...EMPTY_LOR_RECOMMENDER }];
        // Older records filled the form before this question existed.
        const nextAssist: YesNo =
          data.lorAssistance || (data.lor.length ? "yes" : "");
        setAssist(nextAssist);
        setLor(next);
        baselineRef.current = JSON.stringify({ assist: nextAssist, lor: next });
        if (data.updatedAt)
          setSavedNote(
            `Last saved ${new Date(data.updatedAt).toLocaleDateString()}`,
          );
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [token, reloadKey]);

  const dirty = JSON.stringify({ assist, lor }) !== baselineRef.current;

  const setRecommender = (i: number, patch: Partial<LorRecommender>) =>
    setLor((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    );
  const addRecommender = () =>
    setLor((prev) => [...prev, { ...EMPTY_LOR_RECOMMENDER }]);
  const removeRecommender = (i: number) =>
    setLor((prev) =>
      prev.length === 1
        ? [{ ...EMPTY_LOR_RECOMMENDER }]
        : prev.filter((_, idx) => idx !== i),
    );

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const cleaned = lor.filter((r) => Object.values(r).some((v) => v.trim()));
      // On "No" the recommender details aren't sent, so anything entered
      // earlier is kept in case they switch back to "Yes".
      const saved = await updateMySif(token, {
        lorAssistance: assist,
        ...(assist === "yes" ? { lor: cleaned } : {}),
      });
      const next = saved.lor.length
        ? saved.lor
        : [{ ...EMPTY_LOR_RECOMMENDER }];
      setAssist(saved.lorAssistance);
      setLor(next);
      baselineRef.current = JSON.stringify({
        assist: saved.lorAssistance,
        lor: next,
      });
      setSavedNote(savedTimeNote());
      setToast("Saved successfully");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-surface dark:bg-surface-dark"
    >
      <TopBar title="Letter of Recommendation" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          <LoadErrorBanner
            show={loadError}
            onRetry={() => setReloadKey((k) => k + 1)}
          />

          <YesNoQuestion
            question="Do you need assistance with your LOR?"
            hint="Letter of Recommendation — we can help prepare it from details about your recommender."
            value={assist}
            onChange={setAssist}
          />

          {assist === "no" ? (
            <Text className="mb-2 text-center text-[12.5px] leading-5 text-slate-400 dark:text-slate-500">
              No problem — tap Save to confirm. You can switch to Yes any time
              if you need help later.
            </Text>
          ) : null}

          {assist === "yes" ? (
            <>
              <IntroNote>
                Details about the professor or professional who will recommend
                you. These help us prepare your LOR based on your actual
                academic or professional interaction. Add one block per
                recommender — brief points are enough.
              </IntroNote>

              {lor.map((r, i) => (
                <RowCard
                  key={i}
                  title={`Recommender ${i + 1}`}
                  onRemove={() => removeRecommender(i)}
                >
                  <Field
                    label="Name of the Professor / Professional"
                    hint="Full name of the person providing the LOR."
                    value={r.professorName}
                    onChangeText={(v) =>
                      setRecommender(i, { professorName: v })
                    }
                  />
                  <Field
                    label="Official Phone Number"
                    keyboardType="phone-pad"
                    value={r.contactPhone}
                    onChangeText={(v) => setRecommender(i, { contactPhone: v })}
                  />
                  <Field
                    label="Official Email ID"
                    keyboardType="email-address"
                    value={r.contactEmail}
                    onChangeText={(v) => setRecommender(i, { contactEmail: v })}
                  />
                  <Field
                    label="Degree Studied"
                    placeholder="e.g. BA in English"
                    value={r.degreeStudied}
                    onChangeText={(v) =>
                      setRecommender(i, { degreeStudied: v })
                    }
                  />
                  <Field
                    label="CGPA"
                    value={r.cgpa}
                    onChangeText={(v) => setRecommender(i, { cgpa: v })}
                  />
                  <Field
                    label="Subjects / Topics"
                    hint="Subjects or papers they taught you, or the topics they worked with you on."
                    multiline
                    value={r.subjectsTopics}
                    onChangeText={(v) =>
                      setRecommender(i, { subjectsTopics: v })
                    }
                  />
                  <Field
                    label="Projects"
                    hint="Any academic, research, or professional projects you completed under their guidance."
                    multiline
                    value={r.projects}
                    onChangeText={(v) => setRecommender(i, { projects: v })}
                  />
                  <Field
                    label="Internships / Extracurricular Activities"
                    hint="Any internship, leadership role, competition, event, or other notable activity you were involved in."
                    multiline
                    value={r.internshipsActivities}
                    onChangeText={(v) =>
                      setRecommender(i, { internshipsActivities: v })
                    }
                  />
                </RowCard>
              ))}

              <AddRowButton
                label="Add another recommender"
                onPress={addRecommender}
              />

              <Text className="mt-4 text-[11.5px] leading-4 text-slate-400 dark:text-slate-500">
                Ready LOR documents are tracked under “Documents Ready With You”
                in the SIF tab.
              </Text>
            </>
          ) : null}

          <ErrorNote message={error} />
        </ScrollView>

        <SaveBar
          dirty={dirty}
          saving={saving}
          savedNote={savedNote}
          onSave={handleSave}
        />
      </KeyboardAvoidingView>

      <Toast message={toast} tone="success" onHide={() => setToast(null)} />
    </SafeAreaView>
  );
}
