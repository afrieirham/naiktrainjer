import {
  EMPTY_CONNECTION_DRAFT,
  type ConnectionDraft,
} from "../lib/contribution";
import { stationOptionLabel, type Line } from "../lib/lines";
import { FIELD_CLASS } from "./Field";

const REMOVE_CLASS =
  "self-start rounded-md border border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-band disabled:opacity-50";
const ADD_CLASS =
  "self-start rounded-md border border-rule-strong px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition-colors hover:bg-band";

/**
 * The one control that chooses Stations, used by the Contribute form and both
 * admin forms so the three cannot drift. It takes one or more Stations and
 * carries one optional Route frame per pick. Presentation only: it holds the
 * drafts it is handed, and returns the whole list unchanged.
 */
export function StationPicker({
  connections,
  onChange,
  lines,
  error,
}: {
  connections: ConnectionDraft[];
  onChange: (connections: ConnectionDraft[]) => void;
  lines: Line[];
  error?: string;
}) {
  function setConnection(index: number, patch: Partial<ConnectionDraft>) {
    onChange(
      connections.map((connection, i) =>
        i === index ? { ...connection, ...patch } : connection,
      ),
    );
  }

  function addConnection() {
    onChange([...connections, { ...EMPTY_CONNECTION_DRAFT }]);
  }

  function removeConnection(index: number) {
    if (connections.length <= 1) return;
    onChange(connections.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-3">
        <legend className="text-[12px] font-medium text-ink-soft">
          Connections — the stations this place is near
        </legend>
        {connections.map((connection, index) => (
          <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <select
              aria-label={`Station ${index + 1}`}
              aria-required="true"
              value={connection.station}
              onChange={(event) =>
                setConnection(index, { station: event.target.value })
              }
              className={FIELD_CLASS}
            >
              <option value="">Choose a station</option>
              {lines.map((line) => (
                <optgroup key={line.slug} label={line.name}>
                  {line.stations.map((station) => (
                    <option key={station.code} value={station.code}>
                      {stationOptionLabel(station, lines)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input
              aria-label={`Route frame ${index + 1} (optional)`}
              value={connection.embed}
              onChange={(event) =>
                setConnection(index, { embed: event.target.value })
              }
              placeholder="Route frame (optional)"
              className={FIELD_CLASS}
            />
            <button
              type="button"
              onClick={() => removeConnection(index)}
              disabled={connections.length === 1}
              className={REMOVE_CLASS}
            >
              Remove
            </button>
          </div>
        ))}
        <button type="button" onClick={addConnection} className={ADD_CLASS}>
          Add another station
        </button>
      </fieldset>
      {error && <p className="text-[12px] font-medium text-ink">{error}</p>}
    </div>
  );
}
