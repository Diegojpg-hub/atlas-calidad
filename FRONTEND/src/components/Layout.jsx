import {
  Avatar,
  Box,
  Container,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Paper,
  Button,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import HomeIcon from "@mui/icons-material/Home";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import DescriptionIcon from "@mui/icons-material/Description";
import HistoryIcon from "@mui/icons-material/History";
import EditIcon from "@mui/icons-material/Edit";
import LogoutIcon from "@mui/icons-material/Logout";
import Logo from "../assets/logo.svg";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";

const drawerWidth = 240;

export default function Layout() {
  const { role, logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { to: "/home", label: "Inicio", icon: <HomeIcon /> },
    { to: "/clientes", label: "Clientes", icon: <BusinessIcon /> },
    { to: "/contratos", label: "Contratos", icon: <DescriptionIcon /> },
    { to: "/auditoria", label: "Auditoría", icon: <HistoryIcon /> },
    { to: "/usuarios", label: "Usuarios", icon: <PeopleIcon /> },
  ];

  const handleEditAccount = () => {
    setMenuOpen(false);
    navigate(`/usuarios/${user?.usuarioId || 1}/editar`);
  };

  const handleLogout = () => {
    logout();
  };

  const DrawerContent = (
    <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      {/* Logo al inicio */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          py: 3,
          px: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        {isMobile && (
          <IconButton
            aria-label="Cerrar menú"
            onClick={() => setMenuOpen(false)}
            sx={{ position: "absolute", top: 4, right: 4, minWidth: 44, minHeight: 44 }}
          >
            <CloseIcon />
          </IconButton>
        )}
        <img src={Logo} alt="Logo" width={160} />
      </Box>

      {/* Listado de accesos */}
      <List sx={{ flex: 1, py: 2 }}>
        {[...menuItems].map((item) => {
          const active = location.pathname.startsWith(item.to);
          return (
            <ListItem key={item.to} disablePadding sx={{ display: "block" }}>
            <ListItemButton
              selected={active}
              component={Link}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              data-testid={`link-nav-${item.label
                .toLowerCase()
                .replace(/\s+/g, "-")}`}
              sx={{ mx: 1, mb: 0.5, borderRadius: 1 }}
            >
              <ListItemIcon className="!text-primary">{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontFamily: '"Rubik", sans-serif',
                  fontWeight: 500,
                  fontSize: 14,
                }}
              />
            </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Cuadro con información del usuario */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            borderRadius: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 2,
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                bgcolor: "primary.main",
                fontSize: "0.875rem",
                color: "white",
              }}
            >
              {user?.nombre_usuario?.[0]?.toUpperCase() || "U"}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  fontFamily: '"Rubik", sans-serif',
                  fontSize: 14,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.nombre_usuario || "Usuario"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontFamily: '"Rubik", sans-serif',
                  fontSize: 12,
                  lineHeight: 1.2,
                  textTransform: "capitalize",
                  display: "block",
                }}
              >
                {role || "Usuario"}
              </Typography>
            </Box>
          </Box>

          {/* Botones de acción */}
          <Stack spacing={1}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<EditIcon />}
              data-testid="button-layout-editar-cuenta"
              onClick={handleEditAccount}
              sx={{
                minWidth: 44,
                minHeight: 44,
                fontFamily: '"Rubik", sans-serif',
                fontSize: 13,
                textTransform: "none",
                justifyContent: "flex-start",
              }}
            >
              Editar cuenta
            </Button>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<LogoutIcon />}
              data-testid="button-layout-logout"
              onClick={handleLogout}
              sx={{
                minWidth: 44,
                minHeight: 44,
                fontFamily: '"Rubik", sans-serif',
                fontSize: 13,
                textTransform: "none",
                justifyContent: "flex-start",
                color: "error.main",
                borderColor: "error.main",
                "&:hover": {
                  borderColor: "error.dark",
                  backgroundColor: "rgba(211, 47, 47, 0.04)",
                },
              }}
            >
              Cerrar Sesión
            </Button>
          </Stack>
        </Paper>
        <div className="flex justify-center items-center mt-2">
          <span className="text-xs text-gray-500">Versión 1.0.0</span>
        </div>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      <Drawer
        variant={isMobile ? "temporary" : "permanent"}
        open={!isMobile || menuOpen}
        onClose={() => setMenuOpen(false)}
        sx={{
          width: isMobile ? 0 : drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
            overflowY: "auto",
            boxShadow: "4px 0 20px rgba(0, 0, 0, 0.08)",
          },
        }}
      >
        {DrawerContent}
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: "#f2f2f2",
          maxWidth: "100%",
        }}
      >
        {isMobile && (
          <Box sx={{ p: 1, bgcolor: "background.paper" }}>
            <IconButton
              aria-label="Abrir menú"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              data-testid="button-layout-menu"
              sx={{ minWidth: 44, minHeight: 44 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}
        <Container sx={{ py: 3, minWidth: 0 }}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
