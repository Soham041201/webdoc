/**
 * Main layout component for CLI
 */

import React from "react";
import { Box, Text } from "ink";
import { theme } from "./Theme.js";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  return (
    <Box flexDirection="column" padding={1}>
      {title && (
        <Box borderStyle={theme.borders.round} borderColor={theme.colors.primary} paddingX={1}>
          <Text color={theme.colors.primary}>{title}</Text>
        </Box>
      )}
      <Box flexDirection="column" marginTop={1}>
        {children}
      </Box>
    </Box>
  );
};
