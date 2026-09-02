import {
  Bookmark,
  Boxes,
  Briefcase,
  Building2,
  Cloud,
  Code2,
  Coffee,
  Database,
  FlaskConical,
  Folder,
  GraduationCap,
  Heart,
  Home,
  Layers,
  Package,
  Rocket,
  Server,
  Smartphone,
  Star,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  Folder,
  User: Users,
  Users,
  Building2,
  Globe: Cloud,
  Cloud,
  Layers,
  Rocket,
  Star,
  Boxes,
  Code2,
  Heart,
  Briefcase,
  Bookmark,
  Coffee,
  Home,
  Package,
  Server,
  Database,
  Smartphone,
  Zap,
  GraduationCap,
  FlaskConical,
  Wrench,
};

export const ICON_KEYS = Object.keys(ICONS);

export function getIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || Folder;
}
