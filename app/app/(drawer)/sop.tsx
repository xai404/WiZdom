import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ErrorNote,
  Field,
  IntroNote,
  LoadErrorBanner,
  SaveBar,
  savedTimeNote,
  YesNoQuestion,
} from "@/components/sif-form";
import { Toast } from "@/components/toast";
import { TopBar } from "@/components/top-bar";
import { useAuth } from "@/context/auth-context";
import {
  EMPTY_SOP,
  fetchMySif,
  updateMySif,
  type SopDetails,
  type YesNo,
} from "@/lib/sif-api";

// SOP tab — first asks whether the student needs help with their SOP; the
// "Details Required for Statement of Purpose" form only shows on Yes.
// Saves only sif.sopAssistance (+ sif.sop on Yes) — the server merges sections.
export default function SopScreen() {
  const { token } = useAuth();

  const [assist, setAssist] = useState<YesNo>("");
  const [sop, setSop] = useState<SopDetails>({ ...EMPTY_SOP });
  const baselineRef = useRef(JSON.stringify({ assist: "", sop: EMPTY_SOP }));
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
        // Older records filled the form before this question existed.
        const nextAssist: YesNo =
          data.sopAssistance ||
          (Object.values(data.sop).some((v) => v.trim()) ? "yes" : "");
        setAssist(nextAssist);
        setSop(data.sop);
        baselineRef.current = JSON.stringify({
          assist: nextAssist,
          sop: data.sop,
        });
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

  const dirty = JSON.stringify({ assist, sop }) !== baselineRef.current;
  const setSopField = (patch: Partial<SopDetails>) =>
    setSop((prev) => ({ ...prev, ...patch }));

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      // On "No" the SOP details aren't sent, so anything entered earlier is
      // kept in case they switch back to "Yes".
      const saved = await updateMySif(token, {
        sopAssistance: assist,
        ...(assist === "yes" ? { sop } : {}),
      });
      setAssist(saved.sopAssistance);
      setSop(saved.sop);
      baselineRef.current = JSON.stringify({
        assist: saved.sopAssistance,
        sop: saved.sop,
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
      <TopBar title="Statement of Purpose" />

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
            question="Do you need assistance with your SOP?"
            hint="Statement of Purpose — we can help write it from your background, motivation and plans."
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
                Your academic background, interests, motivation and future
                plans. Simple points are fine — they need not be in paragraph
                form. We customise the SOP to each university&apos;s
                requirements.
              </IntroNote>

              <Field
                label="Course Name"
                hint="The exact name of the course you are planning to pursue."
                value={sop.courseName}
                onChangeText={(v) => setSopField({ courseName: v })}
              />
              <Field
                label="Motivation to Pursue the Course"
                hint="Why you want to study this particular course — a personal experience, academic interest, professional experience, career-related interest, or something you observed in the industry or your personal life."
                multiline
                value={sop.motivation}
                onChangeText={(v) => setSopField({ motivation: v })}
              />
              <Field
                label="Additional Information"
                hint="Any other personal, academic, professional, or relevant information you would like to include in your SOP."
                multiline
                value={sop.additionalInfo}
                onChangeText={(v) => setSopField({ additionalInfo: v })}
              />
              <Field
                label="What You Expect to Learn"
                hint="Knowledge, skills, or areas of expertise you hope to gain from the course. You may also mention specific modules that interest you and why."
                multiline
                value={sop.expectationsToLearn}
                onChangeText={(v) => setSopField({ expectationsToLearn: v })}
              />
              <Field
                label="Future Plans After Graduation (focused on India)"
                hint={
                  "What you plan to do after the course, focused on India. You may mention:\n" +
                  "• Companies or industries you would like to work in\n" +
                  "• A family business you plan to join or expand\n" +
                  "• A business idea or startup you would like to pursue\n" +
                  "• A specific area or sector where you would like to build your career\n" +
                  "• How you would like to apply the knowledge and skills gained from the course in India"
                }
                multiline
                value={sop.futurePlans}
                onChangeText={(v) => setSopField({ futurePlans: v })}
              />

              <Text className="mt-1 text-[11.5px] leading-4 text-slate-400 dark:text-slate-500">
                Ready SOP documents are tracked under “Documents Ready With You”
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
