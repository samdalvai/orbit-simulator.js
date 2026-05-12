import { benchmark } from './registry';
import { runModified, runOriginal } from './functions';

benchmark('original', runOriginal);
benchmark('modified', runModified);
