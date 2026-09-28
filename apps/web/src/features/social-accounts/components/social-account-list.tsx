import { Plug, Share2 } from 'lucide-react';
import { FaFacebookF, FaInstagram, FaTiktok } from 'react-icons/fa6';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
const platforms = [
  { name: 'Facebook', icon: FaFacebookF, color: '#1877F2' },
  { name: 'Instagram', icon: FaInstagram, color: '#E1306C' },
  { name: 'TikTok', icon: FaTiktok, color: '#000000' },
];
export function SocialAccountList() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas sociales"
        description="Administra las plataformas donde publicarás tus campañas."
      />
      <Card>
        <CardContent className="flex items-center gap-4">
          <div className="rounded-xl bg-primary/10 p-3 text-primary">
            <Share2 className="size-6" />
          </div>
          <div>
            <p className="font-semibold">Tus canales de publicación</p>
            <p className="text-sm text-muted-foreground">
              La conexión con cuentas reales estará disponible próximamente.
            </p>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {platforms.map(({ name, icon: Icon, color }) => (
          <Card key={name} className="flex h-full flex-col">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div
                    className="flex size-12 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: color }}
                  >
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <CardDescription>Cuenta para publicaciones</CardDescription>
                  </div>
                </div>
                <Badge variant="outline">Próximamente</Badge>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-5 text-center">
                <Plug className="size-7 text-muted-foreground" />
                <p className="mt-3 font-medium">Conecta tu comunidad</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aquí podrás vincular tu cuenta y consultar su estado.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button disabled className="w-full">
                <Plug className="mr-2 size-4" />
                Conectar {name}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
