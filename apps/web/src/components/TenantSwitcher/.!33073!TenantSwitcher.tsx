import React, { useState, useEffect } from 'react';
import { Select, MenuItem, FormControl, InputLabel, Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { tenantApi } from '@/api/unified-core/tenant';
import type { Tenant } from '@/api/unified-core/tenant';

/**
