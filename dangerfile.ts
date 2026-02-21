import { danger, message } from "risk"

message(`Hey there! Everything is working. This PR has ${danger.github.pr.changed_files} changed file(s).`)
