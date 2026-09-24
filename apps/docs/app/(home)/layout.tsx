import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '@/lib/layout.shared';

export default function Layout({ children }: LayoutProps<'/'>) {
  // `dark` switches the navbar's component colors. The bar stays black in global.css.
  return (
    <HomeLayout {...baseOptions()} className="dark">
      {children}
    </HomeLayout>
  );
}
