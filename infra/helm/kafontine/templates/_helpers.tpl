{{/*
Expand the name of the chart.
*/}}
{{- define "kafontine.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "kafontine.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "kafontine.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Target namespace for all parent chart resources.
*/}}
{{- define "kafontine.namespace" -}}
{{- .Release.Namespace -}}
{{- end }}

{{/*
Common labels
*/}}
{{- define "kafontine.labels" -}}
helm.sh/chart: {{ include "kafontine.chart" . }}
{{ include "kafontine.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "kafontine.selectorLabels" -}}
app.kubernetes.io/name: {{ include "kafontine.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "kafontine.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "kafontine.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend image
*/}}
{{- define "kafontine.backend.image" -}}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.backend.image.repository .Values.backend.image.tag }}
{{- else }}
{{- printf "%s:%s" .Values.backend.image.repository .Values.backend.image.tag }}
{{- end }}
{{- end }}

{{/*
Frontend image
*/}}
{{- define "kafontine.frontend.image" -}}
{{- if .Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- else }}
{{- printf "%s:%s" .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- end }}
{{- end }}

{{/*
PostgreSQL service hostname
*/}}
{{- define "kafontine.postgresql.host" -}}
{{- printf "%s-postgresql" .Release.Name }}
{{- end }}

{{/*
Redis service hostname
*/}}
{{- define "kafontine.redis.host" -}}
{{- printf "%s-redis-master" .Release.Name }}
{{- end }}

{{/*
PgBouncer service hostname
*/}}
{{- define "kafontine.pgbouncer.host" -}}
{{- printf "%s-pgbouncer" (include "kafontine.fullname" .) }}
{{- end }}

{{/*
Backend secret values
*/}}
{{- define "kafontine.backend.databaseUrl" -}}
{{- if .Values.backend.secrets.DATABASE_URL }}
{{- .Values.backend.secrets.DATABASE_URL }}
{{- else if .Values.pgbouncer.enabled }}
{{- printf "postgresql://%s:%s@%s:%v/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "kafontine.pgbouncer.host" .) .Values.pgbouncer.service.port .Values.postgresql.auth.database }}
{{- else }}
{{- printf "postgresql://%s:%s@%s:5432/%s" .Values.postgresql.auth.username .Values.postgresql.auth.password (include "kafontine.postgresql.host" .) .Values.postgresql.auth.database }}
{{- end }}
{{- end }}

{{- define "kafontine.backend.redisUrl" -}}
{{- if .Values.backend.secrets.REDIS_URL }}
{{- .Values.backend.secrets.REDIS_URL }}
{{- else }}
{{- printf "redis://:%s@%s:6379" .Values.redis.auth.password (include "kafontine.redis.host" .) }}
{{- end }}
{{- end }}

{{/*
Secret name
*/}}
{{- define "kafontine.secretName" -}}
{{- if .Values.global.existingSecret }}
{{- .Values.global.existingSecret }}
{{- else }}
{{- printf "%s-secrets" (include "kafontine.fullname" .) }}
{{- end }}
{{- end }}

{{/*
Grafana secret name
*/}}
{{- define "kafontine.grafanaSecretName" -}}
{{- printf "%s-grafana" (include "kafontine.fullname" .) }}
{{- end }}

{{/*
PgBouncer auth secret name
*/}}
{{- define "kafontine.pgbouncerAuthSecretName" -}}
{{- printf "%s-pgbouncer-auth" (include "kafontine.fullname" .) }}
{{- end }}
