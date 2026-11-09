/** Chemins typiques des scanners automatiques de vulnérabilités (inexistants sur JOBLINK). */
const PROBES = [
  /(^|\/)\.(env|git|svn|hg|aws|ssh|docker|htaccess|htpasswd|DS_Store)(\/|$|\.)/i,
  /(^|\/)(wp-admin|wp-login|wp-content|wp-includes|xmlrpc|phpmyadmin|pma|cgi-bin|vendor\/phpunit|server-status|actuator|boaform)(\/|$|\.)/i,
  /\.(php\d?|asp|aspx|jsp|cgi|sql|bak|old|swp|ini|log)$/i,
];

export function isProbePath(pathname: string): boolean {
  return PROBES.some((r) => r.test(pathname));
}
