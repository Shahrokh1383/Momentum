export interface PopupOptions {
  url: string;
  title?: string;
  width?: number;
  height?: number;
}

export const openCenteredPopup = ({ url, title = 'OAuth', width = 600, height = 700 }: PopupOptions): Window | null => {
  const left = (window.innerWidth - width) / 2;
  const top = (window.innerHeight - height) / 2;
  
  return window.open(
    url, 
    title, 
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,resizable=yes`
  );
};