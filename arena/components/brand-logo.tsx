interface BrandLogoProps {
  className?: string;
  alt?: string;
}

/**
 * Logotipo Inteligente:
 * - No Tema Escuro: exibe a versão clara (/img/Ativo 1.png)
 * - No Tema Claro: exibe a versão escura (/img/logo.png)
 */
export function BrandLogo({
  className = "w-full h-full object-contain",
  alt = "A Nova Moeda",
}: BrandLogoProps) {
  return (
    <>
      <img
        src="/img/Ativo 1.png"
        alt={alt}
        className={`${className} brand-logo-dark-theme`}
      />
      <img
        src="/img/logo.png"
        alt={alt}
        className={`${className} brand-logo-light-theme`}
      />
    </>
  );
}
