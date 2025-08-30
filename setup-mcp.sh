#!/bin/bash

# Script to generate .mcp.json from template using environment variables
# This allows sharing the configuration without exposing API keys

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔧 Setting up MCP configuration...${NC}"

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Error: .env file not found${NC}"
    echo "Please create a .env file with your API keys (see .env.example)"
    exit 1
fi

# Load environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Check if template exists
if [ ! -f ".mcp.json.template" ]; then
    echo -e "${RED}❌ Error: .mcp.json.template not found${NC}"
    exit 1
fi

# Required variables
required_vars=("BRAVE_API_KEY" "DATABASE_URL" "FIGMA_API_KEY")

# Check if all required variables are set
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}❌ Error: $var is not set in .env file${NC}"
        exit 1
    fi
done

# Create .mcp.json from template by replacing placeholders
echo -e "${YELLOW}📝 Generating .mcp.json from template...${NC}"

# Use sed to replace placeholders with actual values
sed "s|{{BRAVE_API_KEY}}|${BRAVE_API_KEY}|g; s|{{DATABASE_URL}}|${DATABASE_URL}|g; s|{{FIGMA_API_KEY}}|${FIGMA_API_KEY}|g" .mcp.json.template > .mcp.json

# Verify the file was created successfully
if [ -f ".mcp.json" ]; then
    echo -e "${GREEN}✅ .mcp.json generated successfully!${NC}"
    echo -e "${YELLOW}ℹ️  Note: .mcp.json is in .gitignore and won't be committed${NC}"
    echo -e "${YELLOW}ℹ️  You can share .mcp.json.template safely without exposing your secrets${NC}"
else
    echo -e "${RED}❌ Error: Failed to generate .mcp.json${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 MCP configuration setup complete!${NC}"