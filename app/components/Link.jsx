import { Link as ReactRouterLink } from "react-router";

export default function Link({ children, url, ...rest }) {
  // If the URL is external (http), use a standard <a> tag
  if (url.startsWith("http")) {
    return (
      <a href={url} {...rest} rel="noopener noreferrer" target="_blank">
        {children}
      </a>
    );
  }

  // Otherwise, use React Router's Link for internal navigation
  return (
    <ReactRouterLink to={url} {...rest}>
      {children}
    </ReactRouterLink>
  );
}