import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Search, User, X, Check } from "lucide-react";

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  department?: string;
}

export interface UserSelectProps {
  value?: User | User[] | null;
  onChange: (value: User | User[] | null) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  users?: User[];
  onSearch?: (keyword: string) => void;
  allowClear?: boolean;
}

export const UserSelect: React.FC<UserSelectProps> = ({
  value,
  onChange,
  multiple = false,
  placeholder = "选择用户",
  disabled = false,
  loading = false,
  users = [],
  onSearch,
  allowClear = true,
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");

  useEffect(() => {
    onSearch?.(searchKeyword);
  }, [searchKeyword, onSearch]);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (!disabled) {
        setAnchorEl(event.currentTarget);
        setSearchKeyword("");
      }
    },
    [disabled],
  );

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setSearchKeyword("");
  }, []);

  const handleSelect = useCallback(
    (user: User) => {
      if (multiple) {
        const currentValue = (value as User[]) || [];
        const exists = currentValue.find((u) => u.id === user.id);
        if (exists) {
          onChange(currentValue.filter((u) => u.id !== user.id));
        } else {
          onChange([...currentValue, user]);
        }
      } else {
        onChange(user);
        handleClose();
      }
    },
    [value, multiple, onChange, handleClose],
  );

  const handleClear = useCallback(() => {
    onChange(null);
  }, [onChange]);

  const isSelected = useCallback(
    (user: User) => {
      if (!value) return false;
      if (multiple) {
        return (value as User[]).some((u) => u.id === user.id);
      }
      return (value as User).id === user.id;
    },
    [value, multiple],
  );

  const displayValue = multiple
    ? (value as User[])?.map((u) => u.name).join(", ")
    : (value as User)?.name;

  return (
    <Box>
      <TextField
        fullWidth
        size="small"
        value={displayValue || ""}
        placeholder={placeholder}
        onClick={handleClick}
        disabled={disabled}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {allowClear && value && (
                <Chip
                  size="small"
                  label="清除"
                  onDelete={handleClear}
                  sx={{ minWidth: 0, height: 24 }}
                />
              )}
            </Box>
          ),
        }}
      />

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{ sx: { maxHeight: 400, width: "400px" } }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <TextField
            size="small"
            placeholder="搜索用户..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1 }}>
                  <Search size={16} />
                </Box>
              ),
            }}
            fullWidth
          />
        </Box>

        {loading ? (
          <Box sx={{ p: 4, display: "flex", justifyContent: "center" }}>
            <CircularProgress size={24} />
          </Box>
        ) : users.length === 0 ? (
          <MenuItem disabled>
            <ListItemText primary="暂无匹配用户" />
          </MenuItem>
        ) : (
          users.map((user) => (
            <MenuItem
              key={user.id}
              onClick={() => handleSelect(user)}
              selected={isSelected(user)}
              sx={{ display: "flex", alignItems: "center", gap: 2 }}
            >
              <Avatar sx={{ width: 36, height: 36 }}>
                {user.avatar ? (
                  <img src={user.avatar} alt="" />
                ) : (
                  <User size={18} />
                )}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <ListItemText
                  primary={user.name}
                  secondary={user.email || user.department}
                />
              </Box>
              {isSelected(user) && <Check size={18} />}
            </MenuItem>
          ))
        )}
      </Menu>
    </Box>
  );
};

export default UserSelect;
