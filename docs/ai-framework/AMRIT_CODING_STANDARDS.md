# AMRIT Coding Standards for AI Agents

**Version:** 1.0  
**Derived from:** Direct analysis of HWC-API, HWC-UI, FLW-Mobile-App, and Identity-API source code.  
**Purpose:** Enable AI agents (Claude Code, Cursor, Copilot, Gemini) to write AMRIT-compatible
code across all three technology layers without manual context.

---

## AMRIT Ecosystem Overview

AMRIT (Accessible Medical Records via Integrated Technologies) is a public health platform
serving frontline healthcare workers across India. It consists of:

| Layer | Repos | Language/Framework |
|---|---|---|
| Android Mobile | FLW-Mobile-App, HWC-Mobile-App | Kotlin, Android SDK 25–35 |
| Backend APIs | HWC-API, FLW-API, Identity-API, Common-API, FHIR-API | Java 17, Spring Boot, MySQL |
| Angular UIs | HWC-UI, ECD-UI, ADMIN-UI, MMU-UI | TypeScript, Angular 4–19 |

All repos follow a microservice architecture. Each UI talks to its paired API.
Shared concerns (auth, beneficiary data) live in Common-API and Identity-API.

---

## Part 1 — Spring Boot / Java (HWC-API, FLW-API, Common-API)

### 1.1 Package structure

```
com.iemr.hwc                          # root package (varies: hwc, flw, common)
├── controller/                        # REST controllers only — no business logic
│   ├── anc/AntenatalCareController.java
│   ├── pnc/PostnatalCareController.java
│   └── registrar/main/RegistrarController.java
├── service/                           # business logic
│   ├── anc/ANCServiceImpl.java        # concrete implementation
│   ├── anc/ANCDoctorServiceImpl.java  # role-specific sub-service
│   └── nurse/NurseServiceImpl.java
├── repo/                              # Spring Data JPA repositories (NOT repository/)
│   ├── nurse/anc/ANCCareRepo.java
│   └── registrar/RegistrarRepo.java
├── data/                              # JPA entities
│   └── report/
└── utils/                             # utilities, helpers
```

**Key naming conventions:**
- Repos: `*Repo` (e.g. `ANCCareRepo`, `RegistrarRepo`) — NOT `*Repository`
- Services: `*ServiceImpl` for implementations (e.g. `ANCServiceImpl`, `NurseServiceImpl`)
- Controllers: `*Controller` (e.g. `AntenatalCareController`)
- Packages: feature-based sub-packages (`anc/`, `pnc/`, `ncdscreening/`, `registrar/`)

### 1.2 Controller pattern

Controllers are thin. They parse JSON, call one service method, return JSON. No business logic.

```java
@RestController
@RequestMapping(value = "/hwc/anc", headers = "Authorization")
public class AntenatalCareController {

    @Autowired
    private ANCService ancService;

    private Logger logger = LoggerFactory.getLogger(this.getClass().getSimpleName());

    @CrossOrigin()
    @PostMapping(value = "/save/nurseData", produces = MediaType.APPLICATION_JSON_VALUE)
    public String saveANCNurseData(@RequestBody String requestObj) {
        logger.info("Request object length: " + requestObj.length());
        String response;
        try {
            response = ancService.saveANCNurseData(requestObj);
        } catch (Exception e) {
            response = e.getMessage();
            logger.error("Error in /save/nurseData: " + e);
        }
        return response;
    }
}
```

**Rules:**
- `@CrossOrigin()` on all endpoints
- Return type is `String` (JSON serialized manually via Gson)
- Headers must include `"Authorization"` in `@RequestMapping`
- Log request at entry, log errors at catch
- Never return entity objects directly — always serialize to JSON string

### 1.3 Service pattern

```java
@Service
public class ANCServiceImpl implements ANCService {

    @Autowired
    private ANCCareRepo ancCareRepo;

    @Autowired
    private CommonNurseServiceImpl commonNurseServiceImpl;

    @Transactional(rollbackFor = Exception.class)
    public String saveANCNurseData(String requestObj) throws Exception {
        int ancRes = 0;
        ANCCare ancCareOBJ = InputMapper.gson().fromJson(requestObj, ANCCare.class);

        if (ancCareOBJ != null) {
            ancRes = ancCareRepo.save(ancCareOBJ) != null ? 1 : 0;
        }

        if (ancRes > 0) {
            return new OutputMapper().gson().toJson(
                new OutputResponse("Data saved successfully", null, 200, 200)
            );
        } else {
            throw new RuntimeException("ANC data save failed");
        }
    }
}
```

**Rules:**
- `@Service` annotation on implementation class
- `@Transactional(rollbackFor = Exception.class)` on write methods
- Use `InputMapper.gson().fromJson(...)` to deserialize request strings
- Use `OutputMapper().gson().toJson(...)` to serialize responses
- Autowire repos and other services — never instantiate directly

### 1.4 Repository pattern

```java
@Repository
public interface ANCCareRepo extends JpaRepository<ANCCare, Long> {

    // Spring Data derived query
    ANCCare findByBeneficiaryRegIDAndVisitCode(Long beneficiaryRegID, Long visitCode);

    // Custom JPQL query
    @Query(value = "SELECT a FROM ANCCare a WHERE a.beneficiaryRegID = :benRegID "
            + "AND a.visitCode = :visitCode AND a.deleted = false")
    ANCCare getANCCareDetails(
        @Param("benRegID") Long beneficiaryRegID,
        @Param("visitCode") Long visitCode
    );

    // Native SQL when JPQL is insufficient
    @Query(value = "SELECT * FROM t_anc_care WHERE BenRegID = :benRegID LIMIT 1",
           nativeQuery = true)
    ANCCare getLatestANCForBen(@Param("benRegID") Long beneficiaryRegID);
}
```

**Rules:**
- Interface extends `JpaRepository<Entity, ID>`
- Named `*Repo` — never `*Repository` or `*DAO`
- Prefer derived query methods for simple lookups
- Use `@Query` with JPQL for complex queries
- Use `nativeQuery = true` only when JPQL cannot express the query
- Always use `@Param` for named parameters

### 1.5 JPA entity pattern

```java
@Entity
@Table(name = "t_anc_care")
public class ANCCare implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID")
    private Long id;

    @Column(name = "BenRegID")
    private Long beneficiaryRegID;

    @Column(name = "VisitCode")
    private Long visitCode;

    // Audit fields — set once on insert, never updated
    @Column(name = "CreatedBy", updatable = false)
    private String createdBy;

    @Column(name = "CreatedDate", insertable = true, updatable = false)
    private Timestamp createdDate;

    // Modified timestamp managed by DB trigger
    @Column(name = "ModifiedDate", insertable = false, updatable = false)
    private Timestamp modifiedDate;

    @Column(name = "Deleted")
    private Boolean deleted = false;

    @Expose
    @Column(name = "Processed")
    private String processed;

    // getters/setters...
}
```

**Rules:**
- `@Entity` + `@Table(name = "t_tablename")` — table names prefixed with `t_`
- Primary key: `@GeneratedValue(strategy = GenerationType.IDENTITY)`, type `Long`
- Audit fields: `createdBy`, `createdDate` with `updatable = false`
- `modifiedDate` with `insertable = false, updatable = false` (DB-managed)
- Soft delete via `deleted = false` boolean field — never hard delete
- `@Expose` on fields that should be included in Gson serialization
- `implements Serializable` on all entities

### 1.6 Common AMRIT patterns

**Response format:**
```java
// Success
return new OutputMapper().gson().toJson(
    new OutputResponse("Success message", dataObject, 200, 200)
);

// Error
return new OutputMapper().gson().toJson(
    new OutputResponse("Error message", null, 5000, 5000)
);
```

**Input parsing:**
```java
MyRequestClass obj = InputMapper.gson().fromJson(requestObj, MyRequestClass.class);
```

**Logging:**
```java
private Logger logger = LoggerFactory.getLogger(this.getClass().getSimpleName());
logger.info("Request object length: " + requestObj.length());
logger.error("Error in method: " + e.getMessage());
```

**Tech stack:**
- Java 17, Spring Boot, Maven
- MySQL with Hibernate (`ddl-auto=none` — schema managed externally)
- Redis for session management
- Gson for JSON serialization (not Jackson)
- `@CrossOrigin()` required on all controllers

---

## Part 2 — Angular / TypeScript (HWC-UI, ECD-UI, ADMIN-UI)

### 2.1 Module structure

```
src/app/
├── app.module.ts                      # root module
├── app-routing.module.ts
├── app-modules/
│   ├── core/                          # shared across all modules
│   │   ├── core.module.ts
│   │   ├── material.module.ts         # Angular Material imports
│   │   ├── components/                # shared UI components
│   │   └── services/                  # app-wide services
│   │       ├── auth.service.ts
│   │       ├── http-service.service.ts    # central HTTP wrapper
│   │       ├── http-interceptor.service.ts
│   │       └── confirmation.service.ts
│   ├── nurse-doctor/                  # feature module
│   │   ├── nurse-doctor.module.ts
│   │   ├── nurse-doctor-routing.module.ts
│   │   ├── shared/services/           # feature-specific services
│   │   │   ├── nurse.service.ts
│   │   │   └── doctor.service.ts
│   │   └── <feature>/
│   │       ├── <feature>.component.ts
│   │       └── <feature>.component.html
│   └── registrar/
│       ├── shared/services/
│       │   └── registrar.service.ts
│       └── ...
└── user-login/
    ├── user-login.module.ts
    └── service/
        └── service-point.service.ts
```

### 2.2 Component pattern

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NurseService } from '../../shared/services/nurse.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';

@Component({
  selector: 'app-anc-details',
  templateUrl: './anc-details.component.html',
})
export class ANCDetailsComponent implements OnInit, OnDestroy {

  ancDetailsForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private nurseService: NurseService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.ancDetailsForm = this.fb.group({
      lmpDate: [null, Validators.required],
      gestationalAge: [null],
    });
  }

  saveANCDetails(): void {
    if (this.ancDetailsForm.valid) {
      this.nurseService.postANCDetails(this.ancDetailsForm.value).subscribe({
        next: (res: any) => {
          if (res.statusCode === 200) {
            this.confirmationService.alert(res.data.response, 'success');
          }
        },
        error: (err: any) => {
          this.confirmationService.alert(err, 'error');
        }
      });
    }
  }

  ngOnDestroy(): void {
    // unsubscribe from subscriptions
  }
}
```

**Rules:**
- Components use NgModule pattern (not standalone) in existing repos
- Use `FormBuilder` + `FormGroup` for all forms — never template-driven forms
- Inject `ConfirmationService` for all alerts/dialogs — never use `window.alert()`
- `ngOnInit` for initialization, `ngOnDestroy` for cleanup
- All HTTP calls go through feature services, never directly in components

### 2.3 Service pattern

```typescript
import { Injectable } from '@angular/core';
import { HttpServiceService } from '../../../core/services/http-service.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class NurseService {

  private saveANCUrl = environment.saveANCData;

  constructor(private http: HttpServiceService) {}

  postANCDetails(ancForm: any) {
    return this.http.post(this.saveANCUrl, ancForm);
  }

  getANCDetails(benRegID: number, visitCode: number) {
    return this.http.post(environment.getANCData, { benRegID, visitCode });
  }
}
```

**Rules:**
- All HTTP calls via `HttpServiceService` (the central wrapper) — never use `HttpClient` directly
- API URLs defined in `environment.ts` — never hardcode URLs in services
- Services are `@Injectable()` and declared in the feature module's `providers`
- One service per feature domain (`nurse.service.ts`, `doctor.service.ts`, `registrar.service.ts`)

### 2.4 HTTP interceptor awareness

The app uses `http-interceptor.service.ts` which:
- Automatically attaches the auth token to every request
- Handles 401 responses (session expiry)
- Shows/hides the global spinner

Never replicate this logic in individual services.

### 2.5 Confirmation/dialog pattern

```typescript
// Alert (info/success/error/warn)
this.confirmationService.alert('Message here', 'success');
this.confirmationService.alert('Error occurred', 'error');

// Confirm dialog
this.confirmationService.confirm('Title', 'Message').subscribe(result => {
  if (result) {
    // user confirmed
  }
});
```

Never use `window.alert()`, `window.confirm()`, or `MatSnackBar` directly.

### 2.6 Module declaration pattern

```typescript
@NgModule({
  declarations: [
    ANCDetailsComponent,
    PNCComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,           // import from core/material.module
    NurseDoctorRoutingModule,
  ],
  providers: [
    NurseService,
    DoctorService,
  ]
})
export class NurseDoctorModule {}
```

**Rules:**
- Import `MaterialModule` from `core/material.module.ts` — never import individual Material modules
- `ReactiveFormsModule` for all forms
- Services declared in `providers` of the feature module they belong to
- New feature = new sub-folder inside its parent module, declared in parent's `declarations`

### 2.7 Angular version awareness

AMRIT repos are in various states of Angular migration:
- Some repos: Angular 4–12 (NgModule-based, `ngIf`/`ngFor` directives)
- Newer code: Angular 16–19 (`@if`, `@for` control flow, signals being introduced)

**Always match the Angular version of the repo you're working in.** Check `package.json` first.
Do not introduce standalone components or signals into repos still using NgModules.

---

## Part 3 — Kotlin/Android (FLW-Mobile-App, HWC-Mobile-App)

### 3.1 Package structure

```
org.piramalswasthya.sakhi
├── database/room/
│   ├── dao/                   # DAO interfaces
│   └── InAppDb.kt             # single @Database class
├── di/                        # Hilt modules
├── model/                     # Room @Entity classes (named *Cache)
├── repositories/              # one *Repo.kt per domain
├── ui/home_activity/<feature>/
│   ├── <Feature>Fragment.kt
│   └── <Feature>ViewModel.kt
└── work/                      # WorkManager workers
```

### 3.2 Room entity pattern

```kotlin
@Entity(tableName = "MY_TABLE")
data class MyCache(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: Long,

    @ColumnInfo(name = "benId")
    val benId: Long,

    // ALWAYS Int syncState, NEVER Boolean isSynced
    // 0 = UNSYNCED, 1 = SYNCING, 2 = SYNCED
    @ColumnInfo(name = "syncState")
    val syncState: Int = 0
)
```

### 3.3 Migration pattern

**Always guard with `tableExists()` and `columnExists()`:**

```kotlin
val MIGRATION_X_Y = object : Migration(X, Y) {
    override fun migrate(database: SupportSQLiteDatabase) {
        if (!tableExists(database, "MY_TABLE")) {
            database.execSQL("CREATE TABLE `MY_TABLE` (...)")
        }
        if (!columnExists(database, "MY_TABLE", "newCol")) {
            database.execSQL("ALTER TABLE MY_TABLE ADD COLUMN newCol TEXT")
        }
    }
}
```

### 3.4 ViewModel + Fragment pattern

```kotlin
@HiltViewModel
class MyViewModel @Inject constructor(
    private val myRepo: MyRepo
) : ViewModel() {
    val data = myRepo.observe().stateIn(
        viewModelScope, SharingStarted.WhileSubscribed(5_000), null
    )
}

@AndroidEntryPoint
class MyFragment : Fragment() {
    private val viewModel: MyViewModel by viewModels()
    private var _binding: FragmentMyBinding? = null
    private val binding get() = _binding!!

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
```

### 3.5 API 25 compatibility

| ❌ Avoid | ✅ Use instead |
|---|---|
| `java.time.LocalDate` | `java.util.Calendar` + `SimpleDateFormat` |
| `ThreadLocal.withInitial {}` | `object : ThreadLocal<T>() { override fun initialValue() = ... }` |
| `paddingHorizontal` XML | `paddingStart` + `paddingEnd` |

---

## Cross-cutting AMRIT conventions

### Authentication
- All APIs secured via token in `Authorization` header
- Token stored in Redis session (backend) and SharedPreferences (Android)
- Session timeout handled by interceptors — never manage auth in business logic

### Beneficiary identification
- Primary identifier: `beneficiaryRegID` (Long) — the server-assigned ID
- Mobile van sync uses `vanID` + `vanSerialNo` as composite key
- Never use `beneficiaryId` and `beneficiaryRegID` interchangeably — they are different fields

### Soft delete
- All entities support soft delete via `deleted = false` (Java) or `isDeactivate` (Kotlin)
- Never use SQL DELETE — always set `deleted = true`

### Environment configuration
- Backend: environment-specific `.properties` files (`common_local.properties`, `common_dev.properties`)
- Android: product flavors (`saksham`, `mitanin`, `niramay`, `xushrukha`)
- Angular: `environment.ts` / `environment.prod.ts`

### Logging
- Backend: SLF4J via `LoggerFactory.getLogger(this.getClass().getSimpleName())`
- Android: `Timber.d(...)` / `Timber.e(...)`
- Angular: avoid `console.log` in production; use a logging service
