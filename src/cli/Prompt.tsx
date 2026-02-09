/**
 * Approval prompt component
 */

import React from "react";
import { Box, Text, useInput } from "ink";
import { theme } from "./Theme.js";
import type { ActionDecision, ApprovalDecision, NextStepsDecision } from "../agent/Events.js";

interface ApprovalPromptProps {
  action: string;
  api: {
    method: string;
    endpoint: string;
    preview?: string;
  };
  risk: "low" | "medium" | "high";
  onDecision: (decision: ApprovalDecision) => void;
}

export const ApprovalPrompt: React.FC<ApprovalPromptProps> = ({
  action,
  api,
  risk,
  onDecision,
}) => {
  useInput((input) => {
    if (input === "y" || input === "Y") {
      onDecision("yes");
    } else if (input === "n" || input === "N") {
      onDecision("no");
    } else if (input === "d" || input === "D") {
      onDecision("doc");
    }
  });

  const riskColor =
    risk === "high" ? theme.colors.error : risk === "medium" ? theme.colors.warning : theme.colors.info;

  return (
    <Box
      borderStyle={theme.borders.round}
      borderColor={riskColor}
      flexDirection="column"
      padding={1}
      marginY={1}
    >
      <Text color={riskColor} bold>
        ⚠ Sensitive action detected ({risk.toUpperCase()} risk)
      </Text>
      <Text>Action: {action}</Text>
      <Text>
        API: <Text color={theme.colors.primary}>{api.method} {api.endpoint}</Text>
      </Text>
      {api.preview && (
        <Box marginTop={1}>
          <Text color={theme.colors.muted}>Preview: {api.preview}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text>
          [<Text color={theme.colors.success}>y</Text>] Proceed{" "}
          [<Text color={theme.colors.info}>d</Text>] Document only{" "}
          [<Text color={theme.colors.error}>n</Text>] Skip
        </Text>
      </Box>
    </Box>
  );
};

interface ActionSuggestionPromptProps {
  action: string;
  reason?: string;
  onDecision: (decision: ActionDecision) => void;
}

export const ActionSuggestionPrompt: React.FC<ActionSuggestionPromptProps> = ({
  action,
  reason,
  onDecision,
}) => {
  useInput((input) => {
    if (input === "y" || input === "Y") {
      onDecision("yes");
    } else if (input === "n" || input === "N") {
      onDecision("no");
    }
  });

  return (
    <Box
      borderStyle={theme.borders.round}
      borderColor={theme.colors.primary}
      flexDirection="column"
      padding={1}
      marginY={1}
    >
      <Text color={theme.colors.primary} bold>
        🤖 Suggested action
      </Text>
      <Text>Action: {action}</Text>
      {reason && (
        <Box marginTop={1}>
          <Text color={theme.colors.muted}>Reason: {reason}</Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text>
          [<Text color={theme.colors.success}>y</Text>] Yes{" "}
          [<Text color={theme.colors.error}>n</Text>] No
        </Text>
      </Box>
    </Box>
  );
};

interface NextStepsPromptProps {
  summary: string;
  question: string;
  onDecision: (decision: NextStepsDecision) => void;
}

export const NextStepsPrompt: React.FC<NextStepsPromptProps> = ({
  summary,
  question,
  onDecision,
}) => {
  useInput((input) => {
    if (input === "a" || input === "A") {
      onDecision("actions");
    } else if (input === "n" || input === "N") {
      onDecision("network");
    }
  });

  return (
    <Box
      borderStyle={theme.borders.round}
      borderColor={theme.colors.primary}
      flexDirection="column"
      padding={1}
      marginY={1}
    >
      <Text color={theme.colors.primary} bold>
        🧭 Next steps
      </Text>
      <Text>{summary}</Text>
      <Box marginTop={1}>
        <Text>{question}</Text>
      </Box>
      <Box marginTop={1}>
        <Text>
          [<Text color={theme.colors.success}>a</Text>] Suggest actions{" "}
          [<Text color={theme.colors.info}>n</Text>] Use network logs only
        </Text>
      </Box>
    </Box>
  );
};
