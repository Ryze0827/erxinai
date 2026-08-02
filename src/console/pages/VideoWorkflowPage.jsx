import videoWorkflowPoster from "../../assets/console/video-workflow-poster-wide.png";
import { useLocale } from "../i18n";
import { Page, Panel } from "../UI";

export function VideoWorkflowPage() {
  const { t } = useLocale();
  return <Page title={t("videoWorkflow.title")} className="console-video-workflow-page"><Panel className="console-video-workflow-frame"><img className="console-video-workflow-poster" src={videoWorkflowPoster} alt={t("videoWorkflow.title")} /></Panel></Page>;
}
