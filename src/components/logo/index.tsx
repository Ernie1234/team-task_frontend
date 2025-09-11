import { Link } from "react-router-dom";

const Logo = (props: { url?: string }) => {
  const { url = "/" } = props;
  return (
    <div className="flex items-center justify-center sm:justify-start">
      <Link to={url}>
        <div className="flex h-7 w-7 items-center justify-center rounded-md text-primary-foreground">
          {/* <AudioWaveform className="size-4" /> */}
          <img src="/logo.webp" alt="Logo" className="w-full" />
        </div>
      </Link>
    </div>
  );
};

export default Logo;
